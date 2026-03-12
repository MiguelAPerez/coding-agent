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

    const sourceRepoDir = path.join(REPOS_BASE_DIR, user.id, repo.fullName);
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


