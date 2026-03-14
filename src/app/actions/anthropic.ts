"use server";

import { db } from "@/../db";
import { anthropicConfigurations, anthropicModels } from "@/../db/schema";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import Anthropic from "@anthropic-ai/sdk";

export async function getAnthropicConfig() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    return db.select().from(anthropicConfigurations).where(eq(anthropicConfigurations.userId, session.user.id)).get();
}

export async function saveAnthropicConfig(apiKey: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const existing = await getAnthropicConfig();
    const now = new Date();

    if (existing) {
        return db.update(anthropicConfigurations)
            .set({ apiKey, updatedAt: now })
            .where(eq(anthropicConfigurations.id, existing.id))
            .returning()
            .get();
    } else {
        return db.insert(anthropicConfigurations)
            .values({
                userId: session.user.id,
                apiKey,
                updatedAt: now,
                totalInputTokens: 0,
                totalOutputTokens: 0
            })
            .returning()
            .get();
    }
}

export async function getAnthropicModels() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    return db.select().from(anthropicModels).where(eq(anthropicModels.userId, session.user.id)).all();
}

export async function syncAnthropicModels() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const config = await getAnthropicConfig();
    if (!config || !config.apiKey) throw new Error("Anthropic API Key not configured.");

    const anthropic = new Anthropic({ apiKey: config.apiKey });
    const response = await anthropic.models.list();
    
    const now = new Date();
    // Delete old models and insert new ones
    await db.delete(anthropicModels).where(eq(anthropicModels.userId, session.user.id)).run();
    
    for (const model of response.data) {
        await db.insert(anthropicModels).values({
            userId: session.user.id,
            name: model.id,
            details: JSON.stringify(model),
            updatedAt: now
        }).run();
    }

    return getAnthropicModels();
}

export async function testAnthropicConnection(apiKey: string) {
    try {
        const anthropic = new Anthropic({ apiKey });
        const response = await anthropic.models.list();
        return { success: true, modelCount: response.data.length };
    } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : "Connection failed" };
    }
}
