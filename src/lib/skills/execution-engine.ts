import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
// import fs from "fs/promises"; // Removed unused import
import { Skill } from "@/types/agent";

const execAsync = promisify(exec);

export interface SkillExecutionResult {
    stdout: string;
    stderr: string;
    exitCode: number;
    duration: number;
}

export async function executeSkill(
    skill: Skill,
    args: string[] = [],
    env: Record<string, string> = {}
): Promise<SkillExecutionResult> {
    const startTime = Date.now();
    const skillPath = skill.isManaged 
        ? path.join(process.cwd(), "system-statics", "skills", skill.id)
        : path.join(process.cwd(), "data", skill.userId, "skills", skill.id);

    if (!skill.scriptFile) {
        throw new Error(`Skill ${skill.id} has no execution script.`);
    }

    const scriptPath = path.join(skillPath, skill.scriptFile);
    
    // Check if Docker is an option (can be expanded later)
    // For now, we'll implement a robust local execution
    
    let command = "";
    if (skill.scriptFile.endsWith(".py")) {
        command = `python3 "${scriptPath}" ${args.join(" ")}`;
    } else if (skill.scriptFile.endsWith(".ts") || skill.scriptFile.endsWith(".js")) {
        // For TS, we might need ts-node or similar, or just node if it's JS
        const runner = skill.scriptFile.endsWith(".ts") ? "npx ts-node" : "node";
        command = `${runner} "${scriptPath}" ${args.join(" ")}`;
    } else if (skill.scriptFile.endsWith(".php")) {
        command = `php "${scriptPath}" ${args.join(" ")}`;
    } else if (skill.scriptFile.endsWith(".sh")) {
        command = `bash "${scriptPath}" ${args.join(" ")}`;
    } else {
        throw new Error(`Unsupported script type for skill ${skill.id}: ${skill.scriptFile}`);
    }

    // Handle dependencies if requirements file exists
    // NOTE: This is a simplified version. In production, we'd want a persistent environment.
    if (skill.requirementsFile) {
        try {
            if (skill.requirementsFile === "env-requirements.txt") {
                await execAsync(`pip install -r "${path.join(skillPath, skill.requirementsFile)}"`);
            } else if (skill.requirementsFile === "package.json") {
                await execAsync(`npm install --prefix "${skillPath}"`);
            }
        } catch (depError) {
            console.error(`Failed to install dependencies for skill ${skill.id}:`, depError);
            // We continue, as some deps might already be there
        }
    }

    try {
        const { stdout, stderr } = await execAsync(command, {
            env: { ...process.env, ...env },
            cwd: skillPath,
        });

        return {
            stdout,
            stderr,
            exitCode: 0,
            duration: Date.now() - startTime,
        };
    } catch (error: unknown) {
        const err = error as { stdout?: string; stderr?: string; message?: string; code?: number };
        return {
            stdout: err.stdout || "",
            stderr: err.stderr || err.message || String(error),
            exitCode: err.code || 1,
            duration: Date.now() - startTime,
        };
    }
}
