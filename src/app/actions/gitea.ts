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

export async function testGiteaConnection(url: string, token: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    // Clean URL
    const baseUrl = url.replace(/\/+$/, "");
    if (!baseUrl.startsWith("http")) {
        throw new Error("Invalid URL. Must start with http:// or https://");
    }

    try {
        const response = await fetch(`${baseUrl}/api/v1/user`, {
            method: "GET",
            headers: {
                "Authorization": `token ${token}`,
                "Content-Type": "application/json",
            },
            cache: "no-store",
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Connection failed: ${response.status} ${response.statusText}`);
        }

        const userData = await response.json();

        // Gitea returns scopes in the X-Gitea-Token-Scopes header if available
        const scopesHeader = response.headers.get("X-Gitea-Token-Scopes");
        const scopes = scopesHeader ? scopesHeader.split(",").map(s => s.trim()) : ["read:user (default)"];

        return {
            success: true,
            user: {
                username: userData.login,
                email: userData.email,
                avatarUrl: userData.avatar_url,
            },
            scopes: scopes,
        };
    } catch (error) {
        console.error("Gitea test connection error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to connect to Gitea. Please check your URL and token.",
        };
    }
}
