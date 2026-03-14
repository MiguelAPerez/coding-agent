"use server";

import { db } from "@/../db";
import { googleConfigurations, googleModels } from "@/../db/schema";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { GoogleGenAI } from "@google/genai";

export async function getGoogleConfig() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    return db.select().from(googleConfigurations).where(eq(googleConfigurations.userId, session.user.id)).get();
}

export async function saveGoogleConfig(apiKey: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const existing = await getGoogleConfig();
    const now = new Date();

    if (existing) {
        return db.update(googleConfigurations)
            .set({ apiKey, updatedAt: now })
            .where(eq(googleConfigurations.id, existing.id))
            .returning()
            .get();
    } else {
        return db.insert(googleConfigurations)
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

export async function getGoogleModels() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    return db.select().from(googleModels).where(eq(googleModels.userId, session.user.id)).all();
}

export async function syncGoogleModels() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const config = await getGoogleConfig();
    if (!config || !config.apiKey) throw new Error("Google API Key not configured.");

    const genAI = new GoogleGenAI({ apiKey: config.apiKey });
    const response = await genAI.models.list();
    
    const now = new Date();
    // Delete old models and insert new ones
    await db.delete(googleModels).where(eq(googleModels.userId, session.user.id)).run();
    
    const models = [];
    for await (const model of response) {
        // Filter for models that support generateContent
        if (model.name && model.supportedActions?.includes('generateContent')) {
            const shortName = model.name.replace('models/', '');
            await db.insert(googleModels).values({
                userId: session.user.id,
                name: shortName,
                details: JSON.stringify(model),
                updatedAt: now
            }).run();
            models.push({ id: model.name, name: shortName });
        }
    }

    return getGoogleModels();
}

export async function testGoogleConnection(apiKey: string) {
    try {
        const genAI = new GoogleGenAI({ apiKey });
        const response = await genAI.models.list();
        let modelCount = 0;
        for await (const model of response) {
            if (model.supportedActions?.includes('generateContent')) {
                modelCount++;
            }
        }
        return { success: true, modelCount };
    } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : "Connection failed" };
    }
}

export async function deleteGoogleConfig() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    await db.delete(googleConfigurations).where(eq(googleConfigurations.userId, session.user.id)).run();
    await db.delete(googleModels).where(eq(googleModels.userId, session.user.id)).run();
}
