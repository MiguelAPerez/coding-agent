export function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const cron = require("node-cron");
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { analyzeRepoDocs } = require("./lib/analysis");
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { syncRepositories } = require("./lib/sync");
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { semanticIndexing } = require("./lib/semanticIndexing");
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { runBackgroundJob } = require("./lib/background-jobs");
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { CRON_DEFINITIONS } = require("./lib/cron-constants");
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { ConnectionManager } = require("./lib/connections/manager");

        const jobs: Record<string, () => Promise<unknown>> = {
            repository_sync: syncRepositories,
            repository_analysis_docs: analyzeRepoDocs,
            semantic_indexing: semanticIndexing,
        };

        for (const def of CRON_DEFINITIONS) {
            const task = jobs[def.id];
            if (task) {
                cron.schedule(def.schedule, async () => {
                    console.log(`Starting scheduled ${def.name}...`);
                    await runBackgroundJob(def.id, async () => {
                        return await task();
                    });
                });
            }
        }

        console.log("Internal cron jobs registered from centralized definitions");

        // Start all enabled connections
        ConnectionManager.getInstance().startAll().catch((err: Error) => {
            console.error("Failed to start connections:", err);
        });
    }
}
