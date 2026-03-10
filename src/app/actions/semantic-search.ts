"use server";

import fs from "fs/promises";
import path from "path";
import { db } from "@/../db";
import { repositories, codeEmbeddings } from "@/../db/schema";
import { eq, inArray } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { getOllamaConfig } from "./ollama";
import { isPathBlocked } from "@/lib/constants";

const REPOS_BASE_DIR = path.join(process.cwd(), "data", "repos");
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;
const EMBEDDING_MODEL = "nomic-embed-text";

export interface SemanticSearchOptions {
    repoIds: string[];
    query: string;
    limit?: number;
    includeExtensions?: string[];
    excludePatterns?: string[];
    extraBlocklist?: string[];
}

export async function generateEmbedding(text: string): Promise<number[]> {
    const config = await getOllamaConfig();
    if (!config) throw new Error("Ollama not configured");

    // Try modern endpoint first: /api/embed
    try {
        const response = await fetch(`${config.url}/api/embed`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: EMBEDDING_MODEL,
                input: text,
            }),
        });

        if (response.ok) {
            const data = await response.json();
            // /api/embed returns { embeddings: [[...]] }
            if (data.embeddings && data.embeddings.length > 0) {
                return data.embeddings[0];
            }
        }
    } catch (e) {
        console.warn("Modern Ollama embed endpoint failed, falling back to legacy...", e);
    }

    // Fallback to legacy endpoint: /api/embeddings
    const response = await fetch(`${config.url}/api/embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: EMBEDDING_MODEL,
            prompt: text,
        }),
    });

    if (!response.ok) {
        // One last try with :latest suffix if it failed with 404
        if (response.status === 404 && !EMBEDDING_MODEL.includes(":")) {
            const retryRes = await fetch(`${config.url}/api/embeddings`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: `${EMBEDDING_MODEL}:latest`,
                    prompt: text,
                }),
            });
            if (retryRes.ok) {
                const data = await retryRes.json();
                return data.embedding;
            }
        }
        throw new Error(`Ollama embedding error (${response.status}): ${response.statusText}`);
    }

    const data = await response.json();
    return data.embedding;
}

function chunkText(text: string, size: number = CHUNK_SIZE, overlap: number = CHUNK_OVERLAP): string[] {
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
        const end = Math.min(start + size, text.length);
        chunks.push(text.slice(start, end));
        start += size - overlap;
        if (start >= text.length) break;
    }
    return chunks;
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function semanticSearch(options: SemanticSearchOptions) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const { repoIds, query, limit = 20, includeExtensions, excludePatterns, extraBlocklist } = options;
    if (!query.trim()) return [];

    const queryVector = await generateEmbedding(query);

    // Fetch embeddings for selected repos
    let embeddings = db.select()
        .from(codeEmbeddings)
        .where(inArray(codeEmbeddings.repositoryId, repoIds))
        .all();

    // Filter by extensions and patterns if provided
    if (includeExtensions || excludePatterns || extraBlocklist) {
        embeddings = embeddings.filter(emb => {
            if (includeExtensions && !includeExtensions.some(ext => emb.filePath.endsWith(ext))) {
                return false;
            }
            if (excludePatterns && excludePatterns.some(pattern => emb.filePath.includes(pattern))) {
                return false;
            }
            if (extraBlocklist && extraBlocklist.length > 0) {
                const segments = emb.filePath.split(path.sep);
                if (segments.some(segment => extraBlocklist.includes(segment))) {
                    return false;
                }
            }
            return true;
        });
    }

    const results = embeddings.map(emb => {
        const vector = JSON.parse(emb.embedding) as number[];
        const similarity = cosineSimilarity(queryVector, vector);
        return {
            ...emb,
            similarity
        };
    });

    // Sort by similarity and filter by threshold
    const SIMILARITY_THRESHOLD = 0.35; // Lowered for more "fuzzy" semantic feel
    results.sort((a, b) => b.similarity - a.similarity);
    const filteredResults = results.filter(r => r.similarity >= SIMILARITY_THRESHOLD);
    const topResults = filteredResults.slice(0, limit);

    // Group by repo
    const repoMap = new Map<string, {
        repoId: string;
        repoName: string;
        repoFullName: string;
        matches: Array<{
            filePath: string;
            lineNumber: number;
            lineContent: string;
            similarity: number;
            matchStart: number;
            matchEnd: number;
        }>;
    }>();

    // Fetch repo names
    const repos = db.select().from(repositories).where(inArray(repositories.id, repoIds)).all();
    const repoNames = new Map(repos.map(r => [r.id, { name: r.name, fullName: r.fullName }]));

    for (const res of topResults) {
        if (!repoMap.has(res.repositoryId)) {
            const repoInfo = repoNames.get(res.repositoryId);
            repoMap.set(res.repositoryId, {
                repoId: res.repositoryId,
                repoName: repoInfo?.name || "Unknown",
                repoFullName: repoInfo?.fullName || "Unknown",
                matches: []
            });
        }

        const repo = repoMap.get(res.repositoryId);
        if (repo) {
            repo.matches.push({
                filePath: res.filePath,
                lineNumber: res.lineNumber,
                lineContent: res.contentChunk,
                similarity: res.similarity,
                matchStart: 0,
                matchEnd: 0
            });
        }
    }

    return Array.from(repoMap.values());
}

export async function indexRepository(repoId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const repo = db.select().from(repositories).where(eq(repositories.id, repoId)).get();
    if (!repo || repo.userId !== session.user.id) throw new Error("Repository not found");

    await indexRepositoryCore(repoId);
}

export async function indexRepositoryCore(repoId: string) {
    const repo = db.select().from(repositories).where(eq(repositories.id, repoId)).get();
    if (!repo) throw new Error("Repository not found");

    const repoDir = path.join(REPOS_BASE_DIR, repo.fullName);

    try {
        await fs.access(repoDir);
    } catch {
        throw new Error("Repository not cloned");
    }

    // Clear existing embeddings
    db.delete(codeEmbeddings).where(eq(codeEmbeddings.repositoryId, repoId)).run();

    const excludePatterns = ["node_modules", ".git", "dist", "build", ".next", "package-lock.json", "yarn.lock"];
    const includeExtensions = [".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs", ".java", ".c", ".cpp", ".md", ".json", ".yaml", ".sh", ".html", ".css"];

    async function walk(dir: string) {
        let entries;
        try {
            entries = await fs.readdir(dir, { withFileTypes: true });
        } catch {
            return;
        }

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relPath = path.relative(repoDir, fullPath);

            // Apply centralized blocklist
            if (isPathBlocked(relPath)) {
                continue;
            }

            if (excludePatterns.some(p => relPath.split(path.sep).includes(p) || entry.name === p)) {
                continue;
            }

            if (entry.isDirectory()) {
                await walk(fullPath);
            } else {
                const ext = path.extname(entry.name).toLowerCase();
                if (!includeExtensions.includes(ext)) continue;

                try {
                    const content = await fs.readFile(fullPath, "utf-8");
                    const chunks = chunkText(content);

                    for (let i = 0; i < chunks.length; i++) {
                        const chunk = chunks[i];
                        if (chunk.trim().length < 10) continue;

                        const embedding = await generateEmbedding(chunk);

                        db.insert(codeEmbeddings).values({
                            repositoryId: repoId,
                            filePath: relPath,
                            lineNumber: i * 20, // Approximate line number
                            contentChunk: chunk,
                            embedding: JSON.stringify(embedding),
                        }).run();
                    }
                } catch (e) {
                    console.error(`Error indexing file ${relPath}:`, e);
                }
            }
        }
    }

    await walk(repoDir);
}
