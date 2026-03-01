"use server";

import { db } from "@/../db";
import { repositories, giteaConfigurations, repositoryMetadata } from "@/../db/schema";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";

export async function getCachedRepositories() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    const repos = db.select().from(repositories).where(eq(repositories.userId, session.user.id)).all();

    // Fetch metadata for each repo
    const reposWithMetadata = await Promise.all(repos.map(async (repo) => {
        const metadata = db.select().from(repositoryMetadata).where(eq(repositoryMetadata.repositoryId, repo.id)).all();
        return {
            ...repo,
            metadata: metadata.reduce((acc, curr) => {
                acc[curr.key] = curr.value;
                return acc;
            }, {} as Record<string, string>)
        };
    }));

    return reposWithMetadata;
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

        const now = new Date();

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

            let repoId: string;

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
                updatedAt: new Date(gRepo.updated_at),
                cachedAt: now,
            };

            if (existing) {
                db.update(repositories)
                    .set(repoData)
                    .where(eq(repositories.id, existing.id))
                    .run();
                repoId = existing.id;
            } else {
                const newRepo = db.insert(repositories)
                    .values({
                        id: crypto.randomUUID(),
                        ...repoData
                    })
                    .returning()
                    .get();
                repoId = newRepo.id;
            }

            // Upsert metadata (stub for labeling)
            const existingMetadata = db.select().from(repositoryMetadata).where(
                and(
                    eq(repositoryMetadata.repositoryId, repoId),
                    eq(repositoryMetadata.key, "type")
                )
            ).get();

            const metadataValue = gRepo.name.includes("monorepo") ? "monorepo" : "package";

            if (existingMetadata) {
                db.update(repositoryMetadata)
                    .set({ value: metadataValue, updatedAt: now })
                    .where(eq(repositoryMetadata.id, existingMetadata.id))
                    .run();
            } else {
                db.insert(repositoryMetadata)
                    .values({
                        repositoryId: repoId,
                        key: "type",
                        value: metadataValue,
                        updatedAt: now,
                    })
                    .run();
            }
        }
    } catch (error) {
        console.error("Error syncing Gitea:", error);
        throw error;
    }
}
