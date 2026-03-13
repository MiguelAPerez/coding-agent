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
import { listSandboxes, executeSandboxCommand } from "./docker-sandboxes";

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
        const { stdout, stderr } = await execAsync(`git -C "${workspaceRepoDir}" checkout "${branchName}"`);
        return { success: true, stdout, stderr };
    } catch {
        // Try remote checkout
        try {
            await execAsync(`git -C "${workspaceRepoDir}" fetch origin`);
            const { stdout, stderr } = await execAsync(`git -C "${workspaceRepoDir}" checkout -b "${branchName}" "origin/${branchName}"`);
            return { success: true, stdout, stderr };
        } catch (err: unknown) {
            const e = err as { stdout?: string; stderr?: string; message?: string };
            console.error("Failed to checkout branch", err);
            return { 
                success: false, 
                stdout: e.stdout || "", 
                stderr: e.stderr || e.message || `Failed to checkout branch: ${branchName}` 
            };
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
        const { stdout, stderr } = await execAsync(`git -C "${workspaceRepoDir}" checkout -b "${branchName}"`);
        return { success: true, stdout, stderr };
    } catch (err: unknown) {
        const e = err as { stdout?: string; stderr?: string; message?: string };
        console.error("Failed to create branch", e);
        return { 
            success: false, 
            stdout: e.stdout || "", 
            stderr: e.stderr || e.message || `Failed to create branch: ${branchName}` 
        };
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
            // Check for persistent sandbox first
            const sandboxes = await listSandboxes();
            const sandbox = sandboxes.find(s => s.repoIds.includes(repoId));
            
            if (sandbox) {
                const gitConfig = 'git config --global user.email "agent@coding.agent" && git config --global user.name "Coding Agent" && ';
                const res = await executeSandboxCommand(sandbox.id, `${gitConfig}git commit -m "${message.replace(/"/g, '\\"')}"`, repo.name);
                if (!res.success) {
                    throw new Error(res.stderr || "Failed to commit changes in Sandbox.");
                }
                return { success: true, stdout: res.stdout || "Changes committed successfully.", stderr: res.stderr };
            }

            // Fallback to transient Docker Sandbox (docker run --rm)
            const result = await runGitInDocker(workspaceRepoDir, ["commit", "-m", `"${message.replace(/"/g, '\\"')}"`]);
            if (result.exitCode !== 0) {
                throw new Error(result.stderr || "Failed to commit changes in Docker.");
            }
            return { success: true, stdout: result.stdout || "Changes committed successfully.", stderr: result.stderr };
        } else {
            // Fallback to host exec (original behavior)
            await execAsync(`git -C "${workspaceRepoDir}" commit -m "${message.replace(/"/g, '\\"')}"`);
            return { success: true, stdout: "Changes committed successfully.", stderr: "" };
        }
    } catch (e: unknown) {
        const err = e as { stdout?: string; stderr?: string; message?: string };
        console.error("Failed to commit changes", e);
        return { 
            success: false, 
            stdout: err.stdout || "", 
            stderr: err.stderr || err.message || "Failed to commit changes." 
        };
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
             // Check for persistent sandbox first
            const sandboxes = await listSandboxes();
            const sandbox = sandboxes.find(s => s.repoIds.includes(repoId));

            if (sandbox) {
                const res = await executeSandboxCommand(sandbox.id, `git push origin "${branchName}"`, repo.name);
                if (!res.success) {
                    throw new Error(res.stderr || "Failed to push changes in Sandbox.");
                }
                return { success: true, stdout: res.stdout || "Changes pushed successfully.", stderr: res.stderr };
            }

            // Fallback to transient Docker Sandbox (docker run --rm)
            const result = await runGitInDocker(workspaceRepoDir, ["push", "origin", `"${branchName}"`]);
            if (result.exitCode !== 0) {
                throw new Error(result.stderr || "Failed to push changes in Docker.");
            }
            return { success: true, stdout: result.stdout || "Changes pushed successfully.", stderr: result.stderr };
        } else {
            // Fallback to host exec (original behavior)
            await execAsync(`git -C "${workspaceRepoDir}" push origin "${branchName}"`);
            return { success: true, stdout: "Changes pushed successfully.", stderr: "" };
        }
    } catch (e: unknown) {
        const err = e as { stdout?: string; stderr?: string; message?: string };
        console.error("Failed to push changes", e);
        return { 
            success: false, 
            stdout: err.stdout || "", 
            stderr: err.stderr || err.message || "Failed to push changes to remote." 
        };
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
