import { db } from "@/../db";
import { repositories, giteaConfigurations } from "@/../db/schema";
import { eq } from "drizzle-orm";
import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import yaml from "js-yaml";

const execAsync = promisify(exec);
const REPOS_BASE_DIR = path.join(process.cwd(), "data", "repos");

export async function analyzeRepoDocs(filter?: (repo: unknown) => boolean) {
    console.log("Starting repository analysis...");

    try {
        let allRepos = db.select().from(repositories).all();

        // Filter for repos with "docs" or "documentation" topics
        allRepos = allRepos.filter(repo => {
            const topics = repo.topics ? JSON.parse(repo.topics) : [];
            return topics.some((t: string) => t === "docs" || t === "documentation");
        });

        if (filter) {
            allRepos = allRepos.filter(filter);
        }
        console.log(`Found ${allRepos.length} repositories to analyze.`);

        for (const repo of allRepos) {
            console.log(`Analyzing ${repo.fullName}...`);
            try {
                let cloneUrl = repo.url;
                if (repo.source === "gitea") {
                    const config = db.select().from(giteaConfigurations).where(eq(giteaConfigurations.userId, repo.userId)).get();
                    if (config) {
                        try {
                            const urlObj = new URL(repo.url);
                            urlObj.username = config.token;
                            cloneUrl = urlObj.toString();
                        } catch {
                            console.error(`Failed to parse repo URL for ${repo.fullName}`);
                        }
                    }
                }

                await fs.mkdir(REPOS_BASE_DIR, { recursive: true });
                const repoDir = path.join(REPOS_BASE_DIR, repo.fullName);

                let isCloned = false;
                try {
                    await fs.access(repoDir);
                    console.log(`Pulling updates for ${repo.fullName}...`);
                    await execAsync(`git -C "${repoDir}" pull`);
                    isCloned = true;
                } catch {
                    const repoParentDir = path.dirname(repoDir);
                    await fs.mkdir(repoParentDir, { recursive: true });
                    try {
                        console.log(`Cloning ${repo.fullName}...`);
                        await execAsync(`git clone "${cloneUrl}.git" "${repoDir}"`);
                        isCloned = true;
                    } catch (e) {
                        console.error(`Failed to clone ${repo.fullName}`, e);
                    }
                }

                if (!isCloned) continue;

                let currentHash = "none";
                try {
                    const { stdout: hashStdout } = await execAsync(`git -C "${repoDir}" rev-parse HEAD`);
                    currentHash = hashStdout.trim();
                } catch {
                    console.warn(`Could not get HEAD hash for repo: ${repo.fullName}, it might be empty.`);
                }

                if (currentHash !== "none" && currentHash === repo.lastAnalyzedHash) {
                    console.log(`Skipping ${repo.fullName} (hash matches).`);
                    continue;
                }

                // Metadata extraction: Detailed file list with frontmatter
                const fileList: Array<{ path: string; title?: string; description?: string; tags?: string[]; keywords?: string[] }> = [];
                
                interface FrontmatterDetails {
                    title?: string;
                    name?: string;
                    description?: string;
                    summary?: string;
                    tags?: string | string[];
                    keywords?: string | string[];
                }

                async function extractMetadata(dir: string) {
                    try {
                        const files = await fs.readdir(dir, { withFileTypes: true });
                        for (const file of files) {
                            const fullPath = path.join(dir, file.name);
                            if (file.isDirectory() && file.name !== ".git" && file.name !== "node_modules") {
                                await extractMetadata(fullPath);
                            } else if (file.name.endsWith(".md") || file.name.endsWith(".mdx")) {
                                const relPath = path.relative(repoDir, fullPath);
                                try {
                                    const content = await fs.readFile(fullPath, "utf-8");
                                    const frontmatterMatch = content.match(/^---\s*[\s\S]*?---\s*/);
                                    let details: FrontmatterDetails = {};
                                    
                                    if (frontmatterMatch) {
                                        const yamlStr = frontmatterMatch[0].replace(/---/g, "").trim();
                                        details = (yaml.load(yamlStr) as FrontmatterDetails) || {};
                                    }

                                    fileList.push({
                                        path: relPath,
                                        title: details.title || details.name || path.basename(relPath, path.extname(relPath)),
                                        description: details.description || details.summary,
                                        tags: Array.isArray(details.tags) ? details.tags : details.tags ? [details.tags] : [],
                                        keywords: Array.isArray(details.keywords) ? details.keywords : details.keywords ? [details.keywords] : []
                                    });
                                } catch (e) {
                                    console.error(`Error parsing frontmatter for ${relPath}:`, e);
                                    fileList.push({ path: relPath });
                                }
                            }
                        }
                    } catch {
                        // ignore access issues in subdirectories
                    }
                }

                await extractMetadata(repoDir);
                const metadata = {
                    markdown_file_count: fileList.length,
                    fileList: fileList
                };
                console.log(`Extracted metadata for ${repo.fullName}: ${fileList.length} files found.`);

                // Update main repo record with hash, metadata and timestamps
                db.update(repositories)
                    .set({
                        lastAnalyzedHash: currentHash,
                        docsMetadata: JSON.stringify(metadata),
                        analyzedAt: new Date(),
                        updatedAt: new Date(),
                    })
                    .where(eq(repositories.id, repo.id))
                    .run();

                console.log(`Successfully updated analysis for ${repo.fullName}.`);
            } catch (err) {
                console.error(`Error analyzing repo ${repo.fullName}:`, err);
            }
        }

        console.log("Repository analysis complete.");
    } catch (error) {
        console.error("Fatal error during repository analysis:", error);
    }
}
