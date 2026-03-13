import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

export interface GitDockerResult {
    stdout: string;
    stderr: string;
    exitCode: number;
}

/**
 * Runs a git command inside a Docker container for safety.
 * Maps the local directory to /workspace in the container.
 */
export async function runGitInDocker(
    localPath: string,
    args: string[],
    env: Record<string, string> = {}
): Promise<GitDockerResult> {
    const absolutePath = path.resolve(localPath);
    
    // Construct the environment variable flags for docker run
    const envFlags = Object.entries(env)
        .map(([key, value]) => `-e ${key}="${value.replace(/"/g, '\\"')}"`)
        .join(" ");

    // We use --rm to automatically remove the container after execution
    // We map the local directory to /workspace
    // We run as the 'agent' user defined in the Dockerfile
    const command = `docker run --rm -v "${absolutePath}:/workspace" ${envFlags} coding-agent-git git ${args.join(" ")}`;

    try {
        const { stdout, stderr } = await execAsync(command);
        return {
            stdout,
            stderr,
            exitCode: 0,
        };
    } catch (error: unknown) {
        const err = error as { stdout?: string; stderr?: string; message?: string; code?: number };
        return {
            stdout: err.stdout || "",
            stderr: err.stderr || err.message || String(error),
            exitCode: err.code || 1,
        };
    }
}

/**
 * Checks if Docker is running and if the coding-agent-git image exists.
 */
export async function checkGitDockerStatus() {
    try {
        // Check if docker engine is running
        await execAsync("docker info");
        
        // Check if image exists
        const { stdout } = await execAsync('docker images -q coding-agent-git');
        return {
            dockerRunning: true,
            imageBuilt: stdout.trim().length > 0,
        };
    } catch {
        return {
            dockerRunning: false,
            imageBuilt: false,
        };
    }
}
