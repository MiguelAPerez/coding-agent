"use server";

import { db } from "@/../db";
import { defaultAgents } from "@/../db/schema";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { revalidatePath } from "next/cache";

export async function setDefaultAgentAction(agentId: string, page: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const userId = session.user.id;
    const now = new Date();

    const existing = db.select()
        .from(defaultAgents)
        .where(
            and(
                eq(defaultAgents.userId, userId),
                eq(defaultAgents.page, page)
            )
        )
        .get();

    if (existing) {
        db.update(defaultAgents)
            .set({ agentId, updatedAt: now })
            .where(eq(defaultAgents.id, existing.id))
            .run();
    } else {
        db.insert(defaultAgents)
            .values({
                userId,
                agentId,
                page,
                updatedAt: now,
            })
            .run();
    }

    revalidatePath("/chat");
    return { success: true };
}

export async function getDefaultAgentAction(page: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return null;

    const result = db.select()
        .from(defaultAgents)
        .where(
            and(
                eq(defaultAgents.userId, session.user.id),
                eq(defaultAgents.page, page)
            )
        )
        .get();

    return result ? result.agentId : null;
}
