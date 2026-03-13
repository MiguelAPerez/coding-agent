"use server";

import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { db } from "@/../db";
import { repositories } from "@/../db/schema";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { isPathBlocked } from "@/lib/constants";

const execAsync = promisify(exec);
const WORKSPACES_BASE_DIR = path.join(process.cwd(), "data", "workspaces");

// Helper to get authenticated user
async function getUserSession() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");
    return session.user;
}

export interface FileNode {
    name: string;
    path: string;
    type: "file" | "directory";
    children?: FileNode[];
}

// Fetches the file tree for a repository from the workspace
export async function getRepoFileTree(repoId: string): Promise<FileNode[]> {
    const user = await getUserSession();
    const repo = db.select().from(repositories).where(eq(repositories.id, repoId)).get();
    if (!repo) throw new Error("Repository not found");

    const workspaceRepoDir = path.join(WORKSPACES_BASE_DIR, user.id, repo.fullName);

    async function buildTree(dir: string, baseDir: string): Promise<FileNode[]> {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const nodes = await Promise.all(entries.map(async entry => {
            const fullPath = path.join(dir, entry.name);
            const relPath = path.relative(baseDir, fullPath);

            if (entry.name === ".git" || entry.name === "node_modules" || isPathBlocked(relPath)) return null;

            if (entry.isDirectory()) {
                return {
                    name: entry.name,
                    path: relPath,
                    type: "directory" as const,
                    children: await buildTree(fullPath, baseDir)
                };
            } else {
                return {
                    name: entry.name,
                    path: relPath,
                    type: "file" as const
                };
            }
        }));
        return (nodes.filter(n => n !== null) as FileNode[]).sort((a, b) => {
            if (a.type === b.type) return a.name.localeCompare(b.name);
            return a.type === "directory" ? -1 : 1;
        });
    }

    try {
        await fs.access(workspaceRepoDir);
        return await buildTree(workspaceRepoDir, workspaceRepoDir);
    } catch (e) {
        console.error("Failed to build file tree", e);
        return [];
    }
}

// Gets the content of a file in the workspace
export async function getWorkspaceFileContent(repoId: string, filePath: string) {
    if (isPathBlocked(filePath)) throw new Error("Access denied");
    const user = await getUserSession();
    const repo = db.select().from(repositories).where(eq(repositories.id, repoId)).get();
    if (!repo) throw new Error("Repository not found");

    const fullPath = path.join(WORKSPACES_BASE_DIR, user.id, repo.fullName, filePath);
    try {
        return await fs.readFile(fullPath, "utf-8");
    } catch (e) {
        console.error("Failed to read file", e);
        throw new Error(`Failed to read file: ${filePath}`);
    }
}

// Saves content to a file in the workspace
export async function saveWorkspaceFile(repoId: string, filePath: string, content: string) {
    if (isPathBlocked(filePath)) throw new Error("Access denied");
    const user = await getUserSession();
    const repo = db.select().from(repositories).where(eq(repositories.id, repoId)).get();
    if (!repo) throw new Error("Repository not found");

    const fullPath = path.join(WORKSPACES_BASE_DIR, user.id, repo.fullName, filePath);
    try {
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, content, "utf-8");
        return { success: true };
    } catch (e) {
        console.error("Failed to save file", e);
        throw new Error(`Failed to save file: ${filePath}`);
    }
}

// Reverts a file to its state in the git index
export async function revertWorkspaceFile(repoId: string, filePath: string) {
    if (isPathBlocked(filePath)) throw new Error("Access denied");
    const user = await getUserSession();
    const repo = db.select().from(repositories).where(eq(repositories.id, repoId)).get();
    if (!repo) throw new Error("Repository not found");

    const workspaceRepoDir = path.join(WORKSPACES_BASE_DIR, user.id, repo.fullName);
    const fullPath = path.join(workspaceRepoDir, filePath);

    try {
        // Check if file exists in HEAD
        try {
            await execAsync(`git -C "${workspaceRepoDir}" cat-file -e "HEAD:${filePath}"`);
            // Exists in HEAD, checkout from HEAD
            await execAsync(`git -C "${workspaceRepoDir}" checkout HEAD -- "${filePath}"`);
            return { success: true, action: "restored" as const };
        } catch {
            // Not in HEAD, might be untracked - delete it
            await fs.unlink(fullPath);
            return { success: true, action: "deleted" as const };
        }
    } catch (e) {
        console.error("Failed to revert file", e);
        throw new Error(`Failed to revert file: ${filePath}`);
    }
}

// Gets all changed files (status) in the workspace
export async function getWorkspaceChangedFiles(repoId: string) {
    const user = await getUserSession();
    const repo = db.select().from(repositories).where(eq(repositories.id, repoId)).get();
    if (!repo) throw new Error("Repository not found");

    const workspaceRepoDir = path.join(WORKSPACES_BASE_DIR, user.id, repo.fullName);

    try {
        const { stdout } = await execAsync(`git -C "${workspaceRepoDir}" status --porcelain`);
        return stdout
            .split("\n")
            .map(line => {
                if (!line) return null;
                const status = line.substring(0, 2); // Preserve the 2-character status (X and Y)
                const pathStr = line.substring(3);
                return { path: pathStr, status };
            })
            .filter((f): f is { path: string, status: string } => f !== null);
    } catch (e) {
        console.error("Failed to get changed files", e);
        return [];
    }
}

// Gets the content of a file at a specific git reference
export async function getGitFileContent(repoId: string, filePath: string, ref: string = "HEAD") {
    const user = await getUserSession();
    const repo = db.select().from(repositories).where(eq(repositories.id, repoId)).get();
    if (!repo) throw new Error("Repository not found");

    const workspaceRepoDir = path.join(WORKSPACES_BASE_DIR, user.id, repo.fullName);

    try {
        const gitRef = ref ? `${ref}:${filePath}` : `:${filePath}`;
        const { stdout } = await execAsync(`git -C "${workspaceRepoDir}" show "${gitRef}"`, {});
        return stdout;
    } catch {
        if (process.env.NODE_ENV !== "test") {
            console.error("Failed to get git file content");
        }
        return null;
    }
}
