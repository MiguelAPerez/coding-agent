"use server";

import { db } from "@/../db";
import { ollamaConfigurations, ollamaModels } from "@/../db/schema";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { revalidatePath } from "next/cache";

export async function getOllamaConfig() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return null;

    const config = db.select().from(ollamaConfigurations).where(eq(ollamaConfigurations.userId, session.user.id)).get();
    return config || null;
}

export async function saveOllamaConfig(url: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const cleanUrl = url.replace(/\/+$/, "");
    const now = new Date();

    const result = db.insert(ollamaConfigurations)
        .values({
            userId: session.user.id,
            url: cleanUrl,
            updatedAt: now,
        })
        .onConflictDoUpdate({
            target: ollamaConfigurations.userId,
            set: {
                url: cleanUrl,
                updatedAt: now,
            }
        })
        .returning()
        .get();

    // Trigger sync after saving
    await syncOllamaModels();

    revalidatePath("/settings");
    return result;
}

export async function syncOllamaModels() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const config = db.select().from(ollamaConfigurations).where(eq(ollamaConfigurations.userId, session.user.id)).get();
    if (!config) throw new Error("Ollama not configured");

    try {
        const response = await fetch(`${config.url}/api/tags`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
            cache: "no-store",
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch models: ${response.statusText}`);
        }

        const data = await response.json();
        const models = data.models || [];

        // Clear existing models for this user
        db.delete(ollamaModels).where(eq(ollamaModels.userId, session.user.id)).run();

        const now = new Date();
        // Insert new models
        for (const model of models) {
            db.insert(ollamaModels)
                .values({
                    userId: session.user.id,
                    name: model.name,
                    details: JSON.stringify(model.details || {}),
                    updatedAt: now,
                })
                .run();
        }

        revalidatePath("/settings");
        revalidatePath("/evaluation-lab");
        return { success: true, count: models.length };
    } catch (error) {
        console.error("Ollama sync error:", error);
        throw error;
    }
}

export async function getOllamaModels() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return [];

    return db.select().from(ollamaModels).where(eq(ollamaModels.userId, session.user.id)).all();
}

export async function testOllamaConnection(url: string) {
    const cleanUrl = url.replace(/\/+$/, "");
    try {
        const response = await fetch(`${cleanUrl}/api/tags`, {
            method: "GET",
            cache: "no-store",
            signal: AbortSignal.timeout(5000),
        });

        if (!response.ok) {
            return { success: false, error: `Connection failed: ${response.statusText}` };
        }

        const data = await response.json();
        return { success: true, modelCount: data.models?.length || 0 };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to connect to Ollama"
        };
    }
}
