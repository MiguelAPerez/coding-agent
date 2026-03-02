"use server";

import { db } from "@/../db";
import { agentConfigurations } from "@/../db/schema";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { revalidatePath } from "next/cache";

export async function getAgentConfig() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return null;

    const config = db.select().from(agentConfigurations).where(eq(agentConfigurations.userId, session.user.id)).get();
    return config || null;
}

export async function saveAgentConfig(data: { model: string; systemPrompt: string; temperature: number }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const now = new Date();
    const result = db.insert(agentConfigurations)
        .values({
            userId: session.user.id,
            model: data.model,
            systemPrompt: data.systemPrompt,
            temperature: data.temperature,
            updatedAt: now,
        })
        .onConflictDoUpdate({
            target: agentConfigurations.userId,
            set: {
                model: data.model,
                systemPrompt: data.systemPrompt,
                temperature: data.temperature,
                updatedAt: now,
            }
        })
        .returning()
        .get();

    revalidatePath("/agent");
    return result;
}
