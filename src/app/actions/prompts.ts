"use server";

import { db } from "@/../db";
import { systemPrompts, systemPromptSets } from "@/../db/schema";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { revalidatePath } from "next/cache";

export async function getSystemPrompts() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return [];

    return db.select().from(systemPrompts).where(eq(systemPrompts.userId, session.user.id)).all();
}

export async function saveSystemPrompt(data: { id?: string; name: string; content: string }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const now = new Date();
    if (data.id) {
        db.update(systemPrompts)
            .set({
                name: data.name,
                content: data.content,
                updatedAt: now,
            })
            .where(eq(systemPrompts.id, data.id))
            .run();
    } else {
        db.insert(systemPrompts)
            .values({
                userId: session.user.id,
                name: data.name,
                content: data.content,
                updatedAt: now,
            })
            .run();
    }

    revalidatePath("/evaluation-lab");
}

export async function deleteSystemPrompt(id: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    db.delete(systemPrompts).where(eq(systemPrompts.id, id)).run();
    revalidatePath("/evaluation-lab");
}

export async function getSystemPromptSets() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return [];

    return db.select().from(systemPromptSets).where(eq(systemPromptSets.userId, session.user.id)).all();
}

export async function saveSystemPromptSet(data: { id?: string; name: string; description?: string; systemPromptIds: string[] }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const now = new Date();
    const values = {
        name: data.name,
        description: data.description,
        systemPromptIds: JSON.stringify(data.systemPromptIds),
        updatedAt: now,
    };

    if (data.id) {
        db.update(systemPromptSets)
            .set(values)
            .where(eq(systemPromptSets.id, data.id))
            .run();
    } else {
        db.insert(systemPromptSets)
            .values({
                userId: session.user.id,
                ...values,
            })
            .run();
    }

    revalidatePath("/evaluation-lab");
}

export async function deleteSystemPromptSet(id: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    db.delete(systemPromptSets).where(eq(systemPromptSets.id, id)).run();
    revalidatePath("/evaluation-lab");
}
