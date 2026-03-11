"use server";

import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { db } from "@/../db";
import { repositories } from "@/../db/schema";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { isPathBlocked } from "@/lib/constants";
import { cloneOrUpdateRepository } from "./files";

const execAsync = promisify(exec);
const REPOS_BASE_DIR = path.join(process.cwd(), "data", "repos");
const WORKSPACES_BASE_DIR = path.join(process.cwd(), "data", "workspaces");

// Helper to get authenticated user
async function getUserSession() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");
    return session.user;
}

// Fetch all enabled repositories for the current user
export async function getEnabledRepositories() {
    const user = await getUserSession();
    
    const repos = db.select({
        id: repositories.id,
        name: repositories.name,
        fullName: repositories.fullName,
        source: repositories.source,
        language: repositories.language,
    })
    .from(repositories)
    .where(and(
        eq(repositories.userId, user.id),
        eq(repositories.enabled, true)
    ))
    .all();

    return repos;
}

// Initializes a workspace: Creates a local clone from data/repos to data/workspaces/<userId>/<repoFullName>
export async function initWorkspace(repoId: string) {
    const user = await getUserSession();
    
    const repo = db.select().from(repositories).where(eq(repositories.id, repoId)).get();
    if (!repo) throw new Error("Repository not found");
    if (repo.userId !== user.id) throw new Error("Forbidden");

    const sourceRepoDir = path.join(REPOS_BASE_DIR, repo.fullName);
    const workspaceRepoDir = path.join(WORKSPACES_BASE_DIR, user.id, repo.fullName);

    try {
        await fs.access(sourceRepoDir);
    } catch {
        // If source doesn't exist, try to clone it first
        await cloneOrUpdateRepository(repo.id);
    }

    try {
        await fs.access(workspaceRepoDir);
        // Exists, let's just make sure it's up to date with the local source
        // Because the local source might have fetched new branches
        await execAsync(`git -C "${workspaceRepoDir}" fetch origin`);
    } catch {
        // Clone locally from data/repos
        const workspaceParentDir = path.dirname(workspaceRepoDir);
        await fs.mkdir(workspaceParentDir, { recursive: true });
        
        // Local clone
        await execAsync(`git clone "${sourceRepoDir}" "${workspaceRepoDir}"`);
        
        // Ensure user config exists for commits just in case we add that later
        try {
            await execAsync(`git -C "${workspaceRepoDir}" config user.name "${user.name || 'Coding Agent'}"`);
            await execAsync(`git -C "${workspaceRepoDir}" config user.email "agent@example.com"`);
        } catch (e) {
            console.warn("Failed to set git config in workspace", e);
        }
    }

    return { success: true, path: workspaceRepoDir };
}

// Gets the list of branches in the workspace
export async function getRepoBranches(repoId: string) {
    const user = await getUserSession();
    const repo = db.select().from(repositories).where(eq(repositories.id, repoId)).get();
    if (!repo) throw new Error("Repository not found");

    const workspaceRepoDir = path.join(WORKSPACES_BASE_DIR, user.id, repo.fullName);
    
    try {
        const { stdout } = await execAsync(`git -C "${workspaceRepoDir}" branch -a`);
        const branches = stdout.split('\n')
            .map(b => b.trim())
            .filter(b => b.length > 0 && !b.includes('->'))
            .map(b => b.replace(/^\*\s*/, '')) // Remove current branch asterisk
            .map(b => b.replace(/^remotes\/origin\//, '')); // Standardize to local names
            
        // Deduplicate
        return Array.from(new Set(branches));
    } catch (e) {
        console.error("Failed to get branches", e);
        // Fallback
        return ["main"];
    }
}

// Checks out a branch in the workspace
export async function checkoutBranch(repoId: string, branch: string) {
    const user = await getUserSession();
    const repo = db.select().from(repositories).where(eq(repositories.id, repoId)).get();
    if (!repo) throw new Error("Repository not found");

    const workspaceRepoDir = path.join(WORKSPACES_BASE_DIR, user.id, repo.fullName);
    
    try {
        // If it's a remote branch that we don't have locally, git checkout handles creating it usually, 
        // but explicit fetch is safer.
        try {
            await execAsync(`git -C "${workspaceRepoDir}" checkout "${branch}"`);
        } catch {
            // Try fetching from origin and checking out
            await execAsync(`git -C "${workspaceRepoDir}" fetch origin`);
            await execAsync(`git -C "${workspaceRepoDir}" checkout -b "${branch}" "origin/${branch}"`);
        }
        return { success: true };
    } catch (e) {
        console.error("Failed to checkout branch", e);
        throw new Error(`Failed to checkout branch ${branch}`);
    }
}

interface FileNode {
    name: string;
    path: string;
    type: "file" | "directory";
    children?: FileNode[];
}

// Gets the recursive file tree for the checked out workspace
export async function getRepoFileTree(repoId: string) {
    const user = await getUserSession();
    const repo = db.select().from(repositories).where(eq(repositories.id, repoId)).get();
    if (!repo) throw new Error("Repository not found");

    const workspaceRepoDir = path.join(WORKSPACES_BASE_DIR, user.id, repo.fullName);

    async function walk(dir: string, currentPath: string): Promise<FileNode[]> {
        const nodes: FileNode[] = [];
        let files;
        try {
            files = await fs.readdir(dir, { withFileTypes: true });
        } catch {
            return nodes;
        }

        // Sort: directories first, then alphabetical
        files.sort((a, b) => {
            if (a.isDirectory() && !b.isDirectory()) return -1;
            if (!a.isDirectory() && b.isDirectory()) return 1;
            return a.name.localeCompare(b.name);
        });

        for (const file of files) {
            const fullPath = path.join(dir, file.name);
            const relPath = path.join(currentPath, file.name);

            if (isPathBlocked(relPath)) {
                continue;
            }

            if (file.isDirectory()) {
                const children = await walk(fullPath, relPath);
                nodes.push({
                    name: file.name,
                    path: relPath,
                    type: "directory",
                    children
                });
            } else {
                nodes.push({
                    name: file.name,
                    path: relPath,
                    type: "file"
                });
            }
        }
        return nodes;
    }

    try {
        const fileTree = await walk(workspaceRepoDir, "");
        return fileTree;
    } catch (e) {
        console.error("Failed to get file tree", e);
        throw new Error("Failed to read workspace directory");
    }
}

// Gets content of a specific file in the workspace
export async function getWorkspaceFileContent(repoId: string, filePath: string) {
    const user = await getUserSession();
    if (isPathBlocked(filePath)) throw new Error("Access denied: file is in blocklist.");

    const repo = db.select().from(repositories).where(eq(repositories.id, repoId)).get();
    if (!repo) throw new Error("Repository not found");

    const normalizedPath = path.normalize(filePath);
    if (normalizedPath.startsWith("..") || path.isAbsolute(normalizedPath)) {
        throw new Error("Invalid file path");
    }

    const fullPath = path.join(WORKSPACES_BASE_DIR, user.id, repo.fullName, normalizedPath);
    
    try {
        const content = await fs.readFile(fullPath, "utf-8");
        return content;
    } catch {
        throw new Error("File not found or cannot be read");
    }
}

// Saves content to a specific file in the workspace
export async function saveWorkspaceFile(repoId: string, filePath: string, content: string) {
    const user = await getUserSession();
    if (isPathBlocked(filePath)) throw new Error("Access denied: file is in blocklist.");

    const repo = db.select().from(repositories).where(eq(repositories.id, repoId)).get();
    if (!repo) throw new Error("Repository not found");

    const normalizedPath = path.normalize(filePath);
    if (normalizedPath.startsWith("..") || path.isAbsolute(normalizedPath)) {
        throw new Error("Invalid file path");
    }

    const fullPath = path.join(WORKSPACES_BASE_DIR, user.id, repo.fullName, normalizedPath);
    
    try {
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, content, "utf-8");
        return { success: true };
    } catch {
        throw new Error("Failed to write file");
    }
}

// Gets modified/untracked files via git status
export async function getWorkspaceChangedFiles(repoId: string) {
    const user = await getUserSession();
    const repo = db.select().from(repositories).where(eq(repositories.id, repoId)).get();
    if (!repo) throw new Error("Repository not found");

    const workspaceRepoDir = path.join(WORKSPACES_BASE_DIR, user.id, repo.fullName);
    
    try {
        const { stdout } = await execAsync(`git -C "${workspaceRepoDir}" status --porcelain`);
        const files: { path: string, status: string }[] = [];
        
        if (!stdout) return files;
        
        const lines = stdout.split('\n').filter(Boolean);
        for (const line of lines) {
            const status = line.substring(0, 2).trim();
            const filePath = line.substring(3).trim();
            files.push({ path: filePath, status });
        }
        
        return files;
    } catch (e) {
        console.error("Failed to get git status", e);
        return [];
    }
}
