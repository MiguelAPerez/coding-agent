"use server";

import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { db } from "@/../db";
import { repositories, giteaConfigurations } from "@/../db/schema";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";

const execAsync = promisify(exec);
const REPOS_BASE_DIR = path.join(process.cwd(), "data", "repos");

export async function cloneOrUpdateRepository(repoId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const repo = db.select().from(repositories).where(eq(repositories.id, repoId)).get();
    if (!repo) throw new Error("Repository not found");

    if (repo.userId !== session.user.id) throw new Error("Forbidden");

    // Get auth token if from Gitea
    let cloneUrl = repo.url;
    if (repo.source === "gitea") {
        const config = db.select().from(giteaConfigurations).where(eq(giteaConfigurations.userId, session.user.id)).get();
        if (config) {
            // Construct authenticated URL: http://token@domain/path.git
            // Parse repo.url (e.g., http://localhost:3000/miguel/foo)
            try {
                const urlObj = new URL(repo.url);
                urlObj.username = config.token; // Use token as username or just pass token in URL
                cloneUrl = urlObj.toString();
            } catch (e) {
                console.error("Failed to parse repo URL", e);
            }
        }
    }

    // Ensure base dir exists
    await fs.mkdir(REPOS_BASE_DIR, { recursive: true });

    const repoDir = path.join(REPOS_BASE_DIR, repo.fullName);
    
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

    return { success: true, path: repoDir };
}

export async function getRepoMarkdownFiles(repoId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const repo = db.select().from(repositories).where(eq(repositories.id, repoId)).get();
    if (!repo) throw new Error("Repository not found");
    if (repo.userId !== session.user.id) throw new Error("Forbidden");

    const repoDir = path.join(REPOS_BASE_DIR, repo.fullName);
    
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
            
            // Skip .git and node_modules
            if (file.isDirectory()) {
                if (file.name === ".git" || file.name === "node_modules") continue;
                await walk(fullPath);
            } else {
                if (file.name.endsWith(".md") || file.name.endsWith(".mdx")) {
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

    const repo = db.select().from(repositories).where(eq(repositories.id, repoId)).get();
    if (!repo) throw new Error("Repository not found");
    if (repo.userId !== session.user.id) throw new Error("Forbidden");

    // Basic security check to prevent directory traversal
    const normalizedPath = path.normalize(filePath);
    if (normalizedPath.startsWith("..") || path.isAbsolute(normalizedPath)) {
        throw new Error("Invalid file path");
    }

    const fullPath = path.join(REPOS_BASE_DIR, repo.fullName, normalizedPath);
    const content = await fs.readFile(fullPath, "utf-8");
    return content;
}
