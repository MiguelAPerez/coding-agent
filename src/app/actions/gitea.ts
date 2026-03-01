"use server";

import { db } from "@/../db";
import { giteaConfigurations } from "@/../db/schema";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";

export async function getGiteaConfig() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    const config = db.select().from(giteaConfigurations).where(eq(giteaConfigurations.userId, session.user.id)).get();

    if (!config) {
        return null;
    }

    return {
        url: config.url,
        username: config.username,
        token: config.token,
        updatedAt: config.updatedAt,
    };
}

export async function saveGiteaConfig(data: { url: string; username: string; token: string }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    const now = new Date();

    // Using insert with onConflictDoUpdate since userId is unique
    const result = db.insert(giteaConfigurations)
        .values({
            userId: session.user.id,
            url: data.url,
            username: data.username,
            token: data.token,
            updatedAt: now,
        })
        .onConflictDoUpdate({
            target: giteaConfigurations.userId,
            set: {
                url: data.url,
                username: data.username,
                token: data.token,
                updatedAt: now,
            }
        })
        .returning()
        .get();

    return {
        url: result.url,
        username: result.username,
        token: result.token,
        updatedAt: result.updatedAt,
    };
}
