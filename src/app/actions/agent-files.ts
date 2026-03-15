"use server";

import fs from "fs/promises";
import path from "path";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { getSystempPromptFromFile } from "./prompts";

const DATA_BASE_DIR = path.join(process.cwd(), "data");

async function getAgentDirPath(agentName: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const slug = agentName.toLowerCase().replace(/[^a-z0-9]/g, "-");
    return path.join(DATA_BASE_DIR, session.user.id, "agents", slug);
}

export async function getAgentFiles(agentName: string) {
    const agentDir = await getAgentDirPath(agentName);

    const files = ["PERSONALITY.md", "IDENTITY.md", "WORKFLOW.md"];
    const result: Record<string, string> = {};

    for (const file of files) {
        try {
            result[file] = await fs.readFile(path.join(agentDir, file), "utf-8");
        } catch {
            result[file] = "";
        }
    }

    return result;
}

export async function saveAgentFiles(agentName: string, files: { [key: string]: string }) {
    const agentDir = await getAgentDirPath(agentName);

    for (const [file, content] of Object.entries(files)) {
        if (!["PERSONALITY.md", "IDENTITY.md", "WORKFLOW.md"].includes(file)) continue;
        await fs.writeFile(path.join(agentDir, file), content);
    }
}

export async function restoreAgentFiles(agentName: string, personalityId: string) {
    const agentDir = await getAgentDirPath(agentName);

    // In this simplified restore, we just reset PERSONALITY.md to the chosen template
    // and reset IDENTITY/WORKFLOW to system defaults if they are missing or requested.
    // However, the requirement says "only restore if someone hits a big red restore button".
    // We'll reset all three from the template system.

    const personality = await getSystempPromptFromFile(personalityId) || await getSystempPromptFromFile("DEFAULT_PERSONALITY");

    await fs.writeFile(path.join(agentDir, "PERSONALITY.md"), personality);

    const templatesSrc = path.join(process.cwd(), "system-statics", "templates", "agent");
    await fs.copyFile(path.join(templatesSrc, "IDENTITY.md"), path.join(agentDir, "IDENTITY.md"));
    await fs.copyFile(path.join(templatesSrc, "WORKFLOW.md"), path.join(agentDir, "WORKFLOW.md"));

    return { success: true };
}
