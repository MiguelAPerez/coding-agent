import fs from "fs/promises";
import path from "path";
import { db } from "@/../db";
import { repositories } from "@/../db/schema";
import { eq } from "drizzle-orm";
import { isPathBlocked } from "@/lib/constants";

const DATA_BASE_DIR = path.join(process.cwd(), "data");

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

    const fullPath = path.join(DATA_BASE_DIR, userId, "repos", repo.fullName, normalizedPath);
    const content = await fs.readFile(fullPath, "utf-8");
    return content;
}
