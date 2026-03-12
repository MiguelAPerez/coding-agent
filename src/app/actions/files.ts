"use server";

import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { db } from "@/../db";
import { repositories, giteaConfigurations, githubConfigurations } from "@/../db/schema";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { App } from "octokit";
import { isPathBlocked, ALLOWLIST } from "@/lib/constants";

const execAsync = promisify(exec);
const REPOS_BASE_DIR = path.join(process.cwd(), "data", "repos");

export async function cloneOrUpdateRepository(repoId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const repo = db.select().from(repositories).where(eq(repositories.id, repoId)).get();
    if (!repo) throw new Error("Repository not found");

    if (repo.userId !== session.user.id) throw new Error("Forbidden");

    // Get auth token if from Gitea or GitHub
    let cloneUrl = repo.url;
    if (repo.source === "gitea") {
        const config = db.select().from(giteaConfigurations).where(eq(giteaConfigurations.userId, session.user.id)).get();
        if (config) {
            try {
                const urlObj = new URL(repo.url);
                urlObj.username = config.token;
                cloneUrl = urlObj.toString();
            } catch (e) {
                console.error("Failed to parse Gitea repo URL", e);
            }
        }
    } else if (repo.source === "github") {
        // Find associated GitHub App config
        const configId = repo.githubConfigurationId;

        // If not directly linked, try to find ANY config for this user (fallback)
        let config;
        if (configId) {
            config = db.select().from(githubConfigurations).where(and(eq(githubConfigurations.id, configId), eq(githubConfigurations.userId, session.user.id))).get();
        } else {
            config = db.select().from(githubConfigurations).where(eq(githubConfigurations.userId, session.user.id)).get();
        }

        if (config) {
            try {
                const app = new App({
                    appId: config.appId,
                    privateKey: config.privateKey,
                });

                // GitHub App cloning usually uses: x-access-token:<token>@github.com/owner/repo.git
                // We need an installation token. If installationId is saved, use it.
                // Otherwise we might need to find it, but let's assume it's provided or we can try to fetch it.
                let installationId = config.installationId;

                if (!installationId) {
                    // Try to find installation for the owner
                    const { data: installations } = await app.octokit.request("GET /app/installations");
                    // Simple heuristic: pick the first one or try to match owner if we can parse it from repo.fullName
                    const owner = repo.fullName.split('/')[0];
                    const inst = (installations as Array<{ id: number; account?: { login?: string } | null }>).find((i) => i.account?.login?.toLowerCase() === owner.toLowerCase()) || (installations as Array<{ id: number }>)[0];
                    if (inst) {
                        installationId = inst.id.toString();
                    }
                }

                if (installationId) {
                    const octokit = await app.getInstallationOctokit(Number(installationId));
                    const { data: tokenData } = await octokit.request("POST /app/installations/{installation_id}/access_tokens", {
                        installation_id: Number(installationId),
                    }) as { data: { token: string } };

                    const token = tokenData.token;
                    const urlObj = new URL(repo.url);
                    urlObj.username = "x-access-token";
                    urlObj.password = token;
                    cloneUrl = urlObj.toString();
                }
            } catch (e) {
                console.error("Failed to get GitHub installation token", e);
            }
        }
    }

    // Ensure base dir exists
    await fs.mkdir(REPOS_BASE_DIR, { recursive: true });

    const repoDir = path.join(REPOS_BASE_DIR, session.user.id, repo.fullName);

    try {
        await fs.access(repoDir);
        // Exists, pull
        await execAsync(`git -C "${repoDir}" pull`);
    } catch {
        // Doesn't exist, clone
        const repoParentDir = path.dirname(repoDir);
        await fs.mkdir(repoParentDir, { recursive: true });

        await execAsync(`git clone "${cloneUrl}.git" "${repoDir}"`);
    }

    // Get the latest commit hash, fallback to string 'empty' or keep empty if there are no commits
    let lastAnalyzedHash = "none";
    try {
        const { stdout: hashStdout } = await execAsync(`git -C "${repoDir}" rev-parse HEAD`);
        lastAnalyzedHash = hashStdout.trim();
    } catch {
        // This commonly occurs if the repository is completely empty and has no commits
        console.warn(`Could not get HEAD hash for repo: ${repo.fullName}, it might be empty.`);
    }

    // Updating the repo analysis status is now deferred to the repoAnalyzes cron job.
    return { success: true, path: repoDir, hash: lastAnalyzedHash };
}

export async function getRepoMarkdownFiles(repoId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const repo = db.select().from(repositories).where(eq(repositories.id, repoId)).get();
    if (!repo) throw new Error("Repository not found");
    if (repo.userId !== session.user.id) throw new Error("Forbidden");

    const repoDir = path.join(REPOS_BASE_DIR, session.user.id, repo.fullName);

    try {
        await fs.access(repoDir);
    } catch {
        throw new Error("Repository not cloned yet. Please select the repository first.");
    }

    const mdfiles: string[] = [];

    async function walk(dir: string) {
        let files;
        try {
            files = await fs.readdir(dir, { withFileTypes: true });
        } catch {
            return;
        }

        for (const file of files) {
            const fullPath = path.join(dir, file.name);
            const relPath = path.relative(repoDir, fullPath);

            // Apply centralized blocklist
            if (isPathBlocked(relPath)) {
                continue;
            }

            // Skip .git and node_modules (redundant but safe)
            if (file.isDirectory()) {
                await walk(fullPath);
            } else {
                if (ALLOWLIST.some(allowed => file.name.endsWith(allowed))) {
                    mdfiles.push(relPath);
                }
            }
        }
    }

    await walk(repoDir);
    return mdfiles;
}

export async function getRepoFileContent(repoId: string, filePath: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    // Security check: ensure path is not blocked
    if (isPathBlocked(filePath)) {
        throw new Error("Access denied: file is in blocklist.");
    }

    return getRepoFileContentInternal(repoId, filePath, session.user.id);
}

export async function getRepoFileContentInternal(repoId: string, filePath: string, userId: string) {
    // Security check: ensure path is not blocked
    if (isPathBlocked(filePath)) {
        throw new Error("Access denied: file is in blocklist.");
    }

    const repo = db.select().from(repositories).where(eq(repositories.id, repoId)).get();
    if (!repo) throw new Error("Repository not found");
    if (repo.userId !== userId) throw new Error("Forbidden");

    // Basic security check to prevent directory traversal
    const normalizedPath = path.normalize(filePath);
    if (normalizedPath.startsWith("..") || path.isAbsolute(normalizedPath)) {
        throw new Error("Invalid file path");
    }

    const fullPath = path.join(REPOS_BASE_DIR, userId, repo.fullName, normalizedPath);
    const content = await fs.readFile(fullPath, "utf-8");
    return content;
}
