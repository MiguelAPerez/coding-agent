"use server";

import { db } from "@/../db";
import { agentConfigurations } from "@/../db/schema";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { revalidatePath } from "next/cache";
import fs from "fs/promises";
import path from "path";
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

export async function saveSkill(data: { id?: string; name: string; description: string; content: string }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const userId = session.user.id;
    const skillId = data.id || data.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
    const skillDir = path.join(USER_DATA_DIR, userId, "skills", skillId);

    try {
        await fs.mkdir(skillDir, { recursive: true });
        const skillMdPath = path.join(skillDir, "SKILL.md");
        
        // Ensure the content has a title and description header if not present
        let finalContent = data.content;
        if (!finalContent.startsWith("# ")) {
            finalContent = `# ${data.name}\n\n## Description\n${data.description}\n\n${finalContent}`;
        }

        await fs.writeFile(skillMdPath, finalContent, "utf-8");
        revalidatePath("/agent");
        return { success: true, skillId };
    } catch (error) {
        console.error(`Failed to save skill ${skillId}:`, error);
        throw new Error("Failed to save skill");
    }
}
