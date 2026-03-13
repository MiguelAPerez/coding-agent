"use server";

import { db } from "@/../db";
import { repositories, giteaConfigurations, githubConfigurations, users } from "@/../db/schema";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import fs from "fs";
import path from "path";
import { loadRepoData } from "@/lib/mockDataLoader";

export async function getCachedRepositories() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    const userRecord = db.select({ configRepositoryId: users.configRepositoryId }).from(users).where(eq(users.id, session.user.id)).get();

    const repos = db.select({
        id: repositories.id,
        userId: repositories.userId,
        source: repositories.source,
        externalId: repositories.externalId,
        name: repositories.name,
        fullName: repositories.fullName,
        description: repositories.description,
        url: repositories.url,
        stars: repositories.stars,
        forks: repositories.forks,
        language: repositories.language,
        topics: repositories.topics,
        lastAnalyzedHash: repositories.lastAnalyzedHash,
        docsMetadata: repositories.docsMetadata,
        agentMetadata: repositories.agentMetadata,
        analyzedAt: repositories.analyzedAt,
        updatedAt: repositories.updatedAt,
        cachedAt: repositories.cachedAt,
        enabled: repositories.enabled,
        githubConfigurationId: repositories.githubConfigurationId,
        githubConfigName: githubConfigurations.name,
    }).from(repositories)
    .leftJoin(githubConfigurations, eq(repositories.githubConfigurationId, githubConfigurations.id))
    .where(eq(repositories.userId, session.user.id)).all();

    let repositoriesResult = repos.map(repo => ({
        ...repo,
        docsMetadata: repo.docsMetadata ? JSON.parse(repo.docsMetadata as string) : {},
        agentMetadata: repo.agentMetadata ? JSON.parse(repo.agentMetadata as string) : {},
        isConfigRepository: userRecord?.configRepositoryId === repo.id
    }));

    // Auto-clear logic: if config repository is missing from disk, clear it from DB
    if (userRecord?.configRepositoryId) {
        const configRepo = repositoriesResult.find(r => r.id === userRecord.configRepositoryId);
        if (configRepo) {
            const fullPath = path.join(process.cwd(), "data", "repos", session.user.id, configRepo.fullName);
            if (!fs.existsSync(fullPath)) {
                console.warn(`Config repository ${configRepo.fullName} not found at ${fullPath}. Clearing setting.`);
                db.update(users)
                    .set({ configRepositoryId: null })
                    .where(eq(users.id, session.user.id))
                    .run();
                
                // Update local list so it's reflected in the return
                repositoriesResult = repositoriesResult.map(r => ({
                    ...r,
                    isConfigRepository: false
                }));
            }
        }
    }

    return repositoriesResult;
}

export async function setConfigRepository(repoId: string | null) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    db.update(users)
        .set({ configRepositoryId: repoId })
        .where(eq(users.id, session.user.id))
        .run();

    return { success: true };
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

    // Sync Github
    await syncGithub(userId);

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

async function syncGithub(userId: string) {
    const configs = db.select().from(githubConfigurations).where(eq(githubConfigurations.userId, userId)).all();

    if (configs.length === 0) {
        return;
    }

    const { App } = await import("octokit");

    for (const config of configs) {
        try {
            const app = new App({
                appId: config.appId,
                privateKey: config.privateKey,
            });

            // Get all installations for this app
            const { data: installations } = await app.octokit.request("GET /app/installations");

            for (const installation of installations) {
                const octokit = await app.getInstallationOctokit(installation.id);
                
                // Get repositories for this installation
                // GitHub pagination might be needed for many repos, but for now we fetch the first page
                const { data } = await octokit.request("GET /installation/repositories");
                const githubRepos = data.repositories;

                for (const gRepo of githubRepos) {
                    const externalId = gRepo.id.toString();

                    // Try to find existing repo
                    const existing = db.select().from(repositories).where(
                        and(
                            eq(repositories.userId, userId),
                            eq(repositories.source, "github"),
                            eq(repositories.externalId, externalId)
                        )
                    ).get();

                    const repoData = {
                        userId,
                        source: "github",
                        externalId,
                        name: gRepo.name,
                        fullName: gRepo.full_name,
                        description: gRepo.description || "",
                        url: gRepo.html_url,
                        stars: gRepo.stargazers_count || 0,
                        forks: gRepo.forks_count || 0,
                        language: gRepo.language || "",
                        topics: JSON.stringify(gRepo.topics || []),
                        updatedAt: new Date(gRepo.updated_at || new Date()),
                        cachedAt: new Date(),
                        githubConfigurationId: config.id,
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
                                ...repoData,
                                docsMetadata: JSON.stringify(updatedDocsMetadata)
                            })
                            .run();
                    }
                }
            }
        } catch (error) {
            console.error(`Error syncing GitHub config ${config.name}:`, error);
        }
    }
}

export async function getConfigRepoData(feature?: string) {
    const repos = await getCachedRepositories();
    const configRepo = repos.find(r => r.isConfigRepository);
    if (!configRepo) return {
        responseTests: [],
        personas: [],
        systemPromptSets: [],
        agents: []
    };

    const fullPath = path.join(process.cwd(), "data", "repos", configRepo.userId, configRepo.fullName);
    return loadRepoData(fullPath, feature);
}

export async function getRepoDataByFullName(repoFullName: string, feature?: string) {
    const repos = await getCachedRepositories();
    const repo = repos.find(r => r.fullName === repoFullName);
    if (!repo) return {
        responseTests: [],
        personas: [],
        systemPromptSets: [],
        agents: []
    };

    const fullPath = path.join(process.cwd(), "data", "repos", repo.userId, repo.fullName);
    return loadRepoData(fullPath, feature);
}
