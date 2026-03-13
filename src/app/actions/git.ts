"use server";

import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { db } from "@/../db";
import { repositories } from "@/../db/schema";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { runGitInDocker, checkGitDockerStatus } from "@/lib/docker-git";

const execAsync = promisify(exec);
const WORKSPACES_BASE_DIR = path.join(process.cwd(), "data", "workspaces");

// Helper to get authenticated user
async function getUserSession() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");
    return session.user;
}

// Fetches all branches for a repository
export async function getRepoBranches(repoId: string) {
    const user = await getUserSession();
    const repo = db.select().from(repositories).where(eq(repositories.id, repoId)).get();
    if (!repo) throw new Error("Repository not found");

    const workspaceRepoDir = path.join(WORKSPACES_BASE_DIR, user.id, repo.fullName);

    try {
        const { stdout } = await execAsync(`git -C "${workspaceRepoDir}" branch -a`);
        const branches = stdout
            .split("\n")
            .map(b => b.replace("*", "").trim())
            .map(b => b.startsWith("remotes/") ? b.split("/").slice(2).join("/") : b)
            .filter(b => b && !b.includes("->"));
        return Array.from(new Set(branches));
    } catch {
        console.error("Failed to get branches");
        return [];
    }
}

// Checkouts a branch in the workspace
export async function checkoutBranch(repoId: string, branchName: string) {
    const user = await getUserSession();
    const repo = db.select().from(repositories).where(eq(repositories.id, repoId)).get();
    if (!repo) throw new Error("Repository not found");

    const workspaceRepoDir = path.join(WORKSPACES_BASE_DIR, user.id, repo.fullName);

    try {
        // Try local checkout
        await execAsync(`git -C "${workspaceRepoDir}" checkout "${branchName}"`);
        return { success: true };
    } catch {
        // Try remote checkout
        try {
            await execAsync(`git -C "${workspaceRepoDir}" fetch origin`);
            await execAsync(`git -C "${workspaceRepoDir}" checkout -b "${branchName}" "origin/${branchName}"`);
            return { success: true };
        } catch (err) {
            console.error("Failed to checkout branch", err);
            throw new Error(`Failed to checkout branch: ${branchName}`);
        }
    }
}

// Creates a new branch in the workspace
export async function createBranch(repoId: string, branchName: string) {
    const user = await getUserSession();
    const repo = db.select().from(repositories).where(eq(repositories.id, repoId)).get();
    if (!repo) throw new Error("Repository not found");

    const workspaceRepoDir = path.join(WORKSPACES_BASE_DIR, user.id, repo.fullName);

    try {
        await execAsync(`git -C "${workspaceRepoDir}" checkout -b "${branchName}"`);
        return { success: true };
    } catch (e) {
        console.error("Failed to create branch", e);
        throw new Error(`Failed to create branch: ${branchName}`);
    }
}

// Commits all changes in the workspace
export async function commitChanges(repoId: string, message: string) {
    const user = await getUserSession();
    const repo = db.select().from(repositories).where(eq(repositories.id, repoId)).get();
    if (!repo) throw new Error("Repository not found");

    const workspaceRepoDir = path.join(WORKSPACES_BASE_DIR, user.id, repo.fullName);

    try {
        const dockerStatus = await checkGitDockerStatus();
        if (dockerStatus.dockerRunning && dockerStatus.imageBuilt) {
            // Use Docker Sandbox
            const result = await runGitInDocker(workspaceRepoDir, ["commit", "-m", `"${message.replace(/"/g, '\\"')}"`]);
            if (result.exitCode !== 0) {
                throw new Error(result.stderr || "Failed to commit changes in Docker.");
            }
        } else {
            // Fallback to host exec (original behavior)
            await execAsync(`git -C "${workspaceRepoDir}" commit -m "${message.replace(/"/g, '\\"')}"`);
        }
        return { success: true };
    } catch (e: unknown) {
        console.error("Failed to commit changes", e);
        throw new Error("Failed to commit changes. Make sure you have something to commit.");
    }
}

// Pushes the specified branch to origin
export async function pushChanges(repoId: string, branchName: string) {
    const user = await getUserSession();
    const repo = db.select().from(repositories).where(eq(repositories.id, repoId)).get();
    if (!repo) throw new Error("Repository not found");

    const workspaceRepoDir = path.join(WORKSPACES_BASE_DIR, user.id, repo.fullName);

    try {
        const dockerStatus = await checkGitDockerStatus();
        if (dockerStatus.dockerRunning && dockerStatus.imageBuilt) {
            // Use Docker Sandbox
            const result = await runGitInDocker(workspaceRepoDir, ["push", "origin", `"${branchName}"`]);
            if (result.exitCode !== 0) {
                throw new Error(result.stderr || "Failed to push changes in Docker.");
            }
        } else {
            // Fallback to host exec (original behavior)
            await execAsync(`git -C "${workspaceRepoDir}" push origin "${branchName}"`);
        }
        return { success: true };
    } catch (e: unknown) {
        console.error("Failed to push changes", e);
        throw new Error("Failed to push changes to remote.");
    }
}

// Stages a single file
export async function stageFile(repoId: string, filePath: string) {
    const user = await getUserSession();
    const repo = db.select().from(repositories).where(eq(repositories.id, repoId)).get();
    if (!repo) throw new Error("Repository not found");

    const workspaceRepoDir = path.join(WORKSPACES_BASE_DIR, user.id, repo.fullName);

    try {
        await execAsync(`git -C "${workspaceRepoDir}" add "${filePath}"`);
        return { success: true };
    } catch (e) {
        console.error("Failed to stage file", e);
        throw new Error(`Failed to stage file: ${filePath}`);
    }
}

// Unstages a single file
export async function unstageFile(repoId: string, filePath: string) {
    const user = await getUserSession();
    const repo = db.select().from(repositories).where(eq(repositories.id, repoId)).get();
    if (!repo) throw new Error("Repository not found");

    const workspaceRepoDir = path.join(WORKSPACES_BASE_DIR, user.id, repo.fullName);

    try {
        // git restore --staged <file> is the modern way to unstage
        await execAsync(`git -C "${workspaceRepoDir}" restore --staged "${filePath}"`);
        return { success: true };
    } catch {
        console.error("Failed to unstage file");
        throw new Error(`Failed to unstage file: ${filePath}`);
    }
}
