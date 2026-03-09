"use server";

import { db } from "@/../db";
import { repositories, giteaConfigurations } from "@/../db/schema";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";

export async function getCachedRepositories() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    const repos = db.select().from(repositories).where(eq(repositories.userId, session.user.id)).all();

    return repos.map(repo => ({
        ...repo,
        docsMetadata: repo.docsMetadata ? JSON.parse(repo.docsMetadata) : {},
        agentMetadata: repo.agentMetadata ? JSON.parse(repo.agentMetadata) : {}
    }));
}

export async function toggleRepositoryEnabled(repoId: string, enabled: boolean) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    db.update(repositories)
        .set({ enabled })
        .where(and(eq(repositories.id, repoId), eq(repositories.userId, session.user.id)))
        .run();

    return { success: true };
}

export async function syncRepositories() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    const userId = session.user.id;

    // Sync Gitea
    await syncGitea(userId);

    // Sync Github (Stub)
    // await syncGithub(userId);

    return { success: true };
}

async function syncGitea(userId: string) {
    const config = db.select().from(giteaConfigurations).where(eq(giteaConfigurations.userId, userId)).get();

    if (!config) {
        return;
    }

    try {
        const response = await fetch(`${config.url}/api/v1/user/repos`, {
            headers: {
                "Authorization": `token ${config.token}`,
                "Accept": "application/json",
            },
        });

        if (!response.ok) {
            throw new Error(`Gitea API error: ${response.statusText}`);
        }

        const giteaRepos = await response.json();


        for (const gRepo of giteaRepos) {
            const externalId = gRepo.id.toString();

            // Try to find existing repo
            const existing = db.select().from(repositories).where(
                and(
                    eq(repositories.userId, userId),
                    eq(repositories.source, "gitea"),
                    eq(repositories.externalId, externalId)
                )
            ).get();

            const repoData = {
                userId,
                source: "gitea",
                externalId,
                name: gRepo.name,
                fullName: gRepo.full_name,
                description: gRepo.description || "",
                url: gRepo.html_url,
                stars: gRepo.stars_count || 0,
                forks: gRepo.forks_count || 0,
                language: gRepo.language || "",
                topics: JSON.stringify(gRepo.topics || []),
                updatedAt: new Date(gRepo.updated_at),
                cachedAt: new Date(),
            };

            const metadataValue = gRepo.name.includes("monorepo") ? "monorepo" : "package";
            const currentDocsMetadata = existing?.docsMetadata ? JSON.parse(existing.docsMetadata) : {};
            const updatedDocsMetadata = { ...currentDocsMetadata, type: metadataValue };

            if (existing) {
                db.update(repositories)
                    .set({
                        ...repoData,
                        docsMetadata: JSON.stringify(updatedDocsMetadata)
                    })
                    .where(eq(repositories.id, existing.id))
                    .run();
            } else {
                db.insert(repositories)
                    .values({
                        id: crypto.randomUUID(),
                        ...repoData,
                        docsMetadata: JSON.stringify(updatedDocsMetadata)
                    })
                    .run();
            }
        }
    } catch (error) {
        console.error("Error syncing Gitea:", error);
        throw error;
    }
}
