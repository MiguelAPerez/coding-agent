export const CRON_DEFINITIONS = [
    {
        id: "repository_sync",
        name: "Repository Sync",
        schedule: "*/5 * * * *", // Every 15 minutes
        displaySchedule: "Every 5 minutes",
        description: "Clones and pulls updates for enabled repositories."
    },
    {
        id: "repository_analysis_docs",
        name: "Repository Analysis (Docs)",
        schedule: "*/30 * * * *", // Every 30 minutes
        displaySchedule: "Every 30 minutes",
        description: "Extracts metadata and topics for enabled repositories."
    },
    {
        id: "semantic_indexing",
        name: "Semantic Indexing",
        schedule: "0 */5 * * *", // Every 5 hours
        displaySchedule: "Every 5 hours",
        description: "Generates vector embeddings for enabled repositories."
    },
] as const;
