"use server";

import { db } from "@/../db";
import { systemPrompts, systemPromptSets } from "@/../db/schema";
import { eq, and, notInArray } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { revalidatePath } from "next/cache";
import { SystemPrompt } from "@/types/agent";
import fs from "fs/promises";
import path from "path";

const SYSTEM_PROMPTS_DIR = path.join(process.cwd(), "data", "system");

export async function getSystempPromptFromFile(name: string): Promise<string> {
    try {
        const filePath = path.join(SYSTEM_PROMPTS_DIR, `${name.toUpperCase()}.md`);
        return await fs.readFile(filePath, "utf-8");
    } catch (error) {
        console.warn(`Failed to read prompt ${name} from file, falling back to default.`, error);
        return "You are a helpful coding assistant.";
    }
}

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
    revalidatePath("/agent");
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

export async function syncManagedPersonas(personas: SystemPrompt[]) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const userId = session.user.id;
    const personaIds = personas.map(p => p.id);

    // 1. Delete managed personas no longer in the repo
    if (personaIds.length > 0) {
        db.delete(systemPrompts)
            .where(and(
                eq(systemPrompts.userId, userId),
                eq(systemPrompts.isManaged, true),
                notInArray(systemPrompts.id, personaIds)
            ))
            .run();
    } else {
        db.delete(systemPrompts)
            .where(and(
                eq(systemPrompts.userId, userId),
                eq(systemPrompts.isManaged, true)
            ))
            .run();
    }

    // 2. Upsert managed personas
    for (const persona of personas) {
        const existing = db.select().from(systemPrompts).where(eq(systemPrompts.id, persona.id)).get();

        const values = {
            userId,
            name: persona.name,
            content: persona.content,
            isManaged: true,
            updatedAt: new Date(),
        };

        if (existing) {
            db.update(systemPrompts)
                .set(values)
                .where(eq(systemPrompts.id, persona.id))
                .run();
        } else {
            db.insert(systemPrompts)
                .values({
                    id: persona.id,
                    ...values
                })
                .run();
        }
    }
}
