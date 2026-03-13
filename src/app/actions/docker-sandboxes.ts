"use server";

import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { db } from "@/../db";
import { repositories } from "@/../db/schema";
import { inArray } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { revalidatePath } from "next/cache";

const execAsync = promisify(exec);
const WORKSPACES_BASE_DIR = path.join(process.cwd(), "data", "workspaces");

// Helper to get authenticated user
async function getUserSession() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");
    return session.user;
}

export interface SandboxInfo {
    id: string;
    name: string;
    status: string;
    created: string;
    image: string;
    mounts: string[];
    repoIds: string[];
}

/**
 * List active sandboxes started by the coding agent
 */
export async function listSandboxes(): Promise<SandboxInfo[]> {
    try {
        // We filter by label to only show sandboxes created by our app
        // We include .Labels to get the repo IDs we stored
        const { stdout } = await execAsync('docker ps --filter "label=app=coding-agent" --format "{{.ID}}|{{.Names}}|{{.Status}}|{{.CreatedAt}}|{{.Image}}|{{.Mounts}}|{{.Labels}}"');
        
        if (!stdout.trim()) return [];

        return stdout.trim().split("\n").map(line => {
            const [id, name, status, created, image, mounts, labelsStr] = line.split("|");
            
            // Parse labels to find our specific one
            const labels = labelsStr.split(",").reduce((acc, curr) => {
                const [key, value] = curr.split("=");
                if (key && value) acc[key] = value;
                return acc;
            }, {} as Record<string, string>);

            const repoIds = labels["sandbox-repos"] ? labels["sandbox-repos"].split(";") : [];

            return {
                id,
                name: labels["sandbox-name"] || name,
                status,
                created,
                image,
                mounts: mounts ? mounts.split(",").map(m => m.trim()) : [],
                repoIds
            };
        });
    } catch (e) {
        console.error("Failed to list sandboxes:", e);
        return [];
    }
}

/**
 * Create a new persistent development sandbox
 */
export async function createSandbox(name: string, repoIds: string[]) {
    const user = await getUserSession();
    
    // 1. Fetch repositories to get their paths
    const selectedRepos = db.select()
        .from(repositories)
        .where(inArray(repositories.id, repoIds))
        .all();

    if (selectedRepos.length === 0) throw new Error("No repositories selected");

    // 2. Construct volume mounts
    const mountArgs = selectedRepos.map(repo => {
        const workspacePath = path.join(WORKSPACES_BASE_DIR, user.id, repo.fullName);
        const absolutePath = path.resolve(workspacePath);
        return `-v "${absolutePath}:/workspace/${repo.name}"`;
    }).join(" ");

    // 3. Start the container
    // We store the repo IDs in a semicolon-separated label
    const containerName = `sandbox-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now().toString().slice(-6)}`;
    const repoLabel = repoIds.join(";");
    const command = `docker run -d --name "${containerName}" ${mountArgs} --label app=coding-agent --label sandbox-name="${name}" --label sandbox-repos="${repoLabel}" coding-agent-git tail -f /dev/null`;

    try {
        await execAsync(command);
        revalidatePath("/settings");
        return { success: true, containerName };
    } catch (error: unknown) {
        const err = error as Error;
        console.error("Failed to create sandbox:", err);
        throw new Error(err.message || "Failed to start Docker container.");
    }
}

/**
 * Updates an existing sandbox by recreating it with new repositories
 */
export async function updateSandbox(containerId: string, name: string, repoIds: string[]) {
    try {
        // 1. Stop and remove old container
        await execAsync(`docker rm -f ${containerId}`);
        
        // 2. Create new one with updated mounts
        return await createSandbox(name, repoIds);
    } catch (error: unknown) {
        const err = error as Error;
        console.error("Failed to update sandbox:", err);
        throw new Error(err.message || "Failed to update container.");
    }
}

/**
 * Stop and remove a sandbox
 */
export async function stopSandbox(containerId: string) {
    try {
        await execAsync(`docker rm -f ${containerId}`);
        revalidatePath("/settings");
        return { success: true };
    } catch (error: unknown) {
        const err = error as Error;
        console.error("Failed to stop sandbox:", err);
        throw new Error(err.message || "Failed to stop container.");
    }
}
