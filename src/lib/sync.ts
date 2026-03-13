import { db } from "@/../db";
import { repositories } from "@/../db/schema";
import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const REPOS_BASE_DIR = path.join(process.cwd(), "data", "repos");

import { getAuthenticatedCloneUrl } from "./git-auth";

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
