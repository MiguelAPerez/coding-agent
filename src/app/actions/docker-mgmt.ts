"use server";

import { checkGitDockerStatus } from "@/lib/docker-git";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { revalidatePath } from "next/cache";

const execAsync = promisify(exec);

export async function getDockerStatus() {
    return await checkGitDockerStatus();
}

export async function buildGitDockerImage() {
    const setupScript = path.join(process.cwd(), "src", "lib", "docker", "git", "setup-git-docker.sh");
    
    try {
        const { stdout, stderr } = await execAsync(`bash "${setupScript}"`);
        console.log("Docker Build Output:", stdout);
        if (stderr) console.error("Docker Build Error:", stderr);
        
        revalidatePath("/settings");
        return { success: true, output: stdout };
    } catch (error: unknown) {
        const err = error as Error;
        console.error("Failed to build Docker image:", err);
        return { success: false, error: err.message };
    }
}
