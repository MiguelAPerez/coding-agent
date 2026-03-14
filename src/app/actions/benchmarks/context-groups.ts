"use server";

import { db } from "@/../db";
import { contextGroups } from "@/../db/schema";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { revalidatePath } from "next/cache";

export async function getContextGroups() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return [];

    return db.select().from(contextGroups).where(eq(contextGroups.userId, session.user.id)).all();
}

export async function saveContextGroup(data: {
    id?: string;
    name: string;
    description?: string;
    category?: string;
    weight?: number;
    expectations?: string;
    maxSentences?: number;
    systemContext?: string;
    promptTemplate: string;
    toolIds?: string;
    systemPromptIds?: string;
    systemPromptSetIds?: string;
    systemPromptVariations?: string;
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const now = new Date();
    const values = {
        name: data.name,
        description: data.description,
        category: data.category,
        weight: data.weight,
        expectations: data.expectations,
        maxSentences: data.maxSentences,
        systemContext: data.systemContext,
        promptTemplate: data.promptTemplate,
        toolIds: data.toolIds,
        systemPromptIds: data.systemPromptIds,
        systemPromptSetIds: data.systemPromptSetIds,
        systemPromptVariations: data.systemPromptVariations,
        updatedAt: now,
    };

    if (data.id) {
        db.update(contextGroups)
            .set(values)
            .where(eq(contextGroups.id, data.id))
            .run();
    } else {
        db.insert(contextGroups)
            .values({
                userId: session.user.id,
                ...values,
            })
            .run();
    }

    revalidatePath("/evaluation-lab");
}

export async function deleteContextGroup(id: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    db.delete(contextGroups).where(eq(contextGroups.id, id)).run();
    revalidatePath("/evaluation-lab");
}
