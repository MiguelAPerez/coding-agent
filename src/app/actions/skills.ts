"use server";

import { db } from "@/../db";
import { agentConfigurations } from "@/../db/schema";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { revalidatePath } from "next/cache";
import fs from "fs/promises";
import path from "path";
import { execSync } from "child_process";
import { loadAllSkills } from "@/lib/skills";

const USER_DATA_DIR = path.join(process.cwd(), "data");

export async function getSkills() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return [];

    return loadAllSkills(session.user.id);
}

export async function linkSkillToAgent(agentId: string, skillId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const agent = db.select().from(agentConfigurations).where(and(eq(agentConfigurations.id, agentId), eq(agentConfigurations.userId, session.user.id))).get();
    if (!agent) throw new Error("Agent not found");

    const skillIds: string[] = JSON.parse(agent.skillIds || "[]");
    if (!skillIds.includes(skillId)) {
        skillIds.push(skillId);
        db.update(agentConfigurations)
            .set({ skillIds: JSON.stringify(skillIds), updatedAt: new Date() })
            .where(eq(agentConfigurations.id, agentId))
            .run();
    }

    revalidatePath("/agent");
}

export async function unlinkSkillFromAgent(agentId: string, skillId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const agent = db.select().from(agentConfigurations).where(and(eq(agentConfigurations.id, agentId), eq(agentConfigurations.userId, session.user.id))).get();
    if (!agent) throw new Error("Agent not found");

    let skillIds: string[] = JSON.parse(agent.skillIds || "[]");
    if (skillIds.includes(skillId)) {
        skillIds = skillIds.filter(id => id !== skillId);
        db.update(agentConfigurations)
            .set({ skillIds: JSON.stringify(skillIds), updatedAt: new Date() })
            .where(eq(agentConfigurations.id, agentId))
            .run();
    }

    revalidatePath("/agent");
}

export async function deleteSkill(skillId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const userId = session.user.id;
    const skillDir = path.join(USER_DATA_DIR, userId, "skills", skillId);

    try {
        await fs.rm(skillDir, { recursive: true, force: true });
        revalidatePath("/agent");
    } catch (error) {
        console.error(`Failed to delete skill ${skillId}:`, error);
        throw new Error("Failed to delete skill");
    }
}

export async function saveSkill(data: { 
    id?: string; 
    name: string; 
    description: string; 
    content: string;
    runtime?: "local" | "docker";
    envVars?: Record<string, string>;
    scriptFile?: string | null;
    scriptContent?: string | null;
    requirementsFile?: string | null;
    requirementsContent?: string | null;
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const userId = session.user.id;
    const skillId = data.id || data.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
    const skillDir = path.join(USER_DATA_DIR, userId, "skills", skillId);

    try {
        await fs.mkdir(skillDir, { recursive: true });
        
        // Write skill.json
        const configPath = path.join(skillDir, "skill.json");
        await fs.writeFile(configPath, JSON.stringify({
            runtime: data.runtime || "local",
            envVars: data.envVars || {}
        }, null, 2), "utf-8");

        // Write SKILL.md
        const skillMdPath = path.join(skillDir, "SKILL.md");
        let finalContent = data.content;
        if (!finalContent.startsWith("# ")) {
            finalContent = `# ${data.name}\n\n## Description\n${data.description}\n\n${finalContent}`;
        }
        await fs.writeFile(skillMdPath, finalContent, "utf-8");

        // Write Script if provided
        if (data.scriptFile && data.scriptContent !== undefined) {
            const scriptPath = path.join(skillDir, data.scriptFile);
            if (data.scriptContent === null) {
                try { await fs.unlink(scriptPath); } catch { /* ignore */ }
            } else {
                await fs.writeFile(scriptPath, data.scriptContent, "utf-8");
            }
        }

        // Write Requirements if provided
        if (data.requirementsFile && data.requirementsContent !== undefined) {
            const reqPath = path.join(skillDir, data.requirementsFile);
            if (data.requirementsContent === null) {
                try { await fs.unlink(reqPath); } catch { /* ignore */ }
            } else {
                await fs.writeFile(reqPath, data.requirementsContent, "utf-8");
            }
        }

        revalidatePath("/agent");
        return { success: true, skillId };
    } catch (error) {
        console.error(`Failed to save skill ${skillId}:`, error);
        throw new Error("Failed to save skill");
    }
}

export async function syncSystemSkills() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const sourceDir = path.join(process.cwd(), "system-statics", "skills");
    const targetDir = path.join(process.cwd(), "data", "system", "skills");

    try {
        // Clear existing system skills in data/system/skills to ensure a clean sync
        // and avoid "duplicates" if skills were renamed or removed in statics.
        await fs.rm(targetDir, { recursive: true, force: true });
        await fs.mkdir(targetDir, { recursive: true });

        const items = await fs.readdir(sourceDir, { withFileTypes: true });

        for (const item of items) {
            if (item.isDirectory()) {
                const s = path.join(sourceDir, item.name);
                const t = path.join(targetDir, item.name);
                await fs.mkdir(t, { recursive: true });
                
                const files = await fs.readdir(s);
                for (const file of files) {
                    await fs.copyFile(path.join(s, file), path.join(t, file));
                }
            }
        }
        revalidatePath("/agent");
        return { success: true };
    } catch (error) {
        console.error("Failed to sync system skills:", error);
        throw new Error("Failed to sync system skills");
    }
}

export async function importSkillFromRepo(repoUrl: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const userId = session.user.id;
    const repoName = repoUrl.split("/").pop()?.replace(".git", "") || "imported-skill";
    const targetDir = path.join(USER_DATA_DIR, userId, "skills", repoName);

    try {
        // Simple implementation: clone to target dir
        // In a real app, you'd probably use a temp dir and validate contents first
        execSync(`git clone ${repoUrl} ${targetDir}`);
        
        revalidatePath("/agent");
        return { success: true, skillId: repoName };
    } catch (error) {
        console.error("Failed to import skill from repo:", error);
        throw new Error("Failed to import skill from repo");
    }
}
