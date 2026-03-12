"use server";

import fs from "fs/promises";
import path from "path";
import { db } from "@/../db";
import { repositories } from "@/../db/schema";
import { inArray } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";

const REPOS_BASE_DIR = path.join(process.cwd(), "data", "repos");

export interface SearchMatch {
    filePath: string;
    lineNumber: number;
    lineContent: string;
    matchStart: number;
    matchEnd: number;
    similarity?: number;
}

export interface RepoSearchResult {
    repoId: string;
    repoName: string;
    repoFullName: string;
    matches: SearchMatch[];
}

export interface CodeSearchOptions {
    repoIds: string[];
    pattern: string;
    caseSensitive?: boolean;
    wholeWord?: boolean;
    includeExtensions?: string[]; // e.g., [".ts", ".tsx"]
    excludePatterns?: string[];   // e.g., ["node_modules", ".git"]
    extraBlocklist?: string[];
    maxMatchesPerFile?: number;
    maxFiles?: number;
}

export async function searchCode(options: CodeSearchOptions): Promise<RepoSearchResult[]> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const {
        repoIds,
        pattern,
        caseSensitive = false,
        wholeWord = false,
        includeExtensions = [],
        excludePatterns = ["node_modules", ".git", "dist", "build", ".next"],
        extraBlocklist = [],
        maxMatchesPerFile = 50,
        maxFiles = 500,
    } = options;

    if (!pattern || pattern.trim() === "") {
        return [];
    }

    // Validate regex
    let regex: RegExp;
    try {
        const flags = caseSensitive ? "g" : "gi";
        const wrappedPattern = wholeWord ? `\\b(?:${pattern})\\b` : pattern;
        regex = new RegExp(wrappedPattern, flags);
    } catch {
        throw new Error("Invalid regular expression pattern");
    }

    // Fetch repos from DB, verify ownership
    const userRepos = db
        .select()
        .from(repositories)
        .where(
            inArray(repositories.id, repoIds)
        )
        .all()
        .filter((r) => r.userId === session.user!.id);

    const results: RepoSearchResult[] = [];

    for (const repo of userRepos) {
        const repoDir = path.join(REPOS_BASE_DIR, repo.userId, repo.fullName);

        try {
            await fs.access(repoDir);
        } catch {
            // Repo not cloned, skip
            continue;
        }

        const matches: SearchMatch[] = [];
        let fileCount = 0;

        async function walk(dir: string) {
            if (fileCount >= maxFiles) return;

            let entries;
            try {
                entries = await fs.readdir(dir, { withFileTypes: true });
            } catch {
                return;
            }

            for (const entry of entries) {
                if (fileCount >= maxFiles) break;

                const fullPath = path.join(dir, entry.name);
                const relPath = path.relative(repoDir, fullPath);

                // Apply extra blocklist if provided
                if (extraBlocklist.length > 0) {
                    const segments = relPath.split(path.sep);
                    if (segments.some(segment => extraBlocklist.includes(segment))) {
                        continue;
                    }
                }

                // Exclude patterns
                if (excludePatterns.some((p) => relPath.split(path.sep).includes(p) || entry.name === p)) {
                    continue;
                }

                if (entry.isDirectory()) {
                    await walk(fullPath);
                } else {
                    // Extension filter
                    if (includeExtensions.length > 0) {
                        const ext = path.extname(entry.name).toLowerCase();
                        if (!includeExtensions.includes(ext)) continue;
                    }

                    fileCount++;
                    let content: string;
                    try {
                        content = await fs.readFile(fullPath, "utf-8");
                    } catch {
                        continue;
                    }

                    const lines = content.split("\n");
                    let fileMatchCount = 0;

                    for (let i = 0; i < lines.length; i++) {
                        if (fileMatchCount >= maxMatchesPerFile) break;

                        regex.lastIndex = 0;
                        const line = lines[i];
                        const execResult = regex.exec(line);

                        if (execResult) {
                            matches.push({
                                filePath: relPath,
                                lineNumber: i + 1,
                                lineContent: line,
                                matchStart: execResult.index,
                                matchEnd: execResult.index + execResult[0].length,
                            });
                            fileMatchCount++;
                        }
                    }
                }
            }
        }

        await walk(repoDir);

        results.push({
            repoId: repo.id,
            repoName: repo.name,
            repoFullName: repo.fullName,
            matches,
        });
    }

    return results;
}
