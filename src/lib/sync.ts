import { db } from "@/../db";
import { repositories, giteaConfigurations, githubConfigurations } from "@/../db/schema";
import { eq } from "drizzle-orm";
import { App } from "octokit";
import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const REPOS_BASE_DIR = path.join(process.cwd(), "data", "repos");

async function getAuthenticatedCloneUrl(repo: { url: string; source: string; userId: string; fullName: string; githubConfigurationId?: string | null }): Promise<string | null> {
    const cloneUrl = repo.url;
    try {
        if (repo.source === "gitea") {
            const config = db.select().from(giteaConfigurations).where(eq(giteaConfigurations.userId, repo.userId)).get();
            if (config) {
                const urlObj = new URL(repo.url);
                urlObj.username = config.token;
                return urlObj.toString();
            }
        } else if (repo.source === "github") {
            const config = repo.githubConfigurationId
                ? db.select().from(githubConfigurations).where(eq(githubConfigurations.id, repo.githubConfigurationId)).get()
                : db.select().from(githubConfigurations).where(eq(githubConfigurations.userId, repo.userId)).get();

            if (config) {
                const app = new App({ appId: config.appId, privateKey: config.privateKey });
                let installationId = config.installationId;
                if (!installationId) {
                    const { data: installations } = await app.octokit.request("GET /app/installations");
                    const owner = repo.fullName.split('/')[0];
                    const inst = installations.find((i: { account?: { login?: string } | null }) => i.account?.login?.toLowerCase() === owner.toLowerCase()) || installations[0];
                    if (inst) installationId = inst.id.toString();
                }

                if (installationId) {
                    const octokit = await app.getInstallationOctokit(Number(installationId));
                    const { data: tokenData } = await octokit.request("POST /app/installations/{installation_id}/access_tokens", {
                        installation_id: Number(installationId),
                    }) as { data: { token: string } };
                    const urlObj = new URL(repo.url);
                    urlObj.username = "x-access-token";
                    urlObj.password = tokenData.token;
                    return urlObj.toString();
                }
            }
        }
    } catch (e) {
        console.error(`Failed to get authenticated URL for ${repo.fullName}`, e);
    }
    return cloneUrl;
}

export async function syncRepositories(repoIds?: string[]) {
    console.log("Starting repository sync...");
    try {
        let allRepos = db.select().from(repositories).all();
        if (repoIds && repoIds.length > 0) {
            allRepos = allRepos.filter(r => repoIds.includes(r.id));
        } else {
            allRepos = allRepos.filter(r => r.enabled !== false);
        }

        await fs.mkdir(REPOS_BASE_DIR, { recursive: true });

        for (const repo of allRepos) {
            console.log(`Syncing ${repo.fullName}...`);
            const repoDir = path.join(REPOS_BASE_DIR, repo.userId, repo.fullName);
            const cloneUrl = await getAuthenticatedCloneUrl(repo);

            try {
                await fs.access(repoDir);
                await execAsync(`git -C "${repoDir}" pull`);
            } catch {
                const repoParentDir = path.dirname(repoDir);
                await fs.mkdir(repoParentDir, { recursive: true });
                await execAsync(`git clone "${cloneUrl}.git" "${repoDir}"`);
            }
        }
        console.log("Repository sync complete.");
        return { success: true };
    } catch (error) {
        console.error("Fatal error during repository sync:", error);
        throw error;
    }
}
