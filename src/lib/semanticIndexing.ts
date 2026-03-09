import { db } from "@/../db";
import crypto from "crypto";
import { repositories, backgroundJobs } from "@/../db/schema";
import { eq } from "drizzle-orm";
import { indexRepositoryCore } from "@/app/actions/semantic-search";

export async function semanticIndexing() {
    console.log("Starting scheduled semantic indexing...");
    
    const jobId = crypto.randomUUID();
    const startTime = new Date();
    
    db.insert(backgroundJobs).values({
        id: jobId,
        name: "semantic_index_all",
        status: "running",
        startedAt: startTime,
    }).run();

    try {
        // Get all enabled repositories
        const allRepos = db.select().from(repositories).where(eq(repositories.enabled, true)).all();
        
        let successCount = 0;
        let failCount = 0;

        for (const repo of allRepos) {
            try {
                console.log(`Cron: Indexing ${repo.fullName}...`);
                await indexRepositoryCore(repo.id);
                successCount++;
            } catch (e) {
                console.error(`Cron: Failed to index ${repo.fullName}`, e);
                failCount++;
            }
        }

        db.update(backgroundJobs).set({
            status: "completed",
            completedAt: new Date(),
            details: JSON.stringify({
                successCount,
                failCount,
                totalRepos: allRepos.length,
                durationMs: Date.now() - startTime.getTime()
            })
        }).where(eq(backgroundJobs.id, jobId)).run();
        
        console.log(`Scheduled indexing complete. Success: ${successCount}, Failed: ${failCount}`);
    } catch (err) {
        console.error("Scheduled indexing fatal error:", err);
        db.update(backgroundJobs).set({
            status: "failed",
            completedAt: new Date(),
            error: err instanceof Error ? err.message : String(err)
        }).where(eq(backgroundJobs.id, jobId)).run();
    }
}
