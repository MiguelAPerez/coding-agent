import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { users } from "./core"

export const benchmarkRuns = sqliteTable("benchmark_run", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    models: text("models").notNull(), // JSON array of model names
    contextGroupIds: text("contextGroupIds").notNull(), // JSON array of context group IDs
    systemPromptIds: text("systemPromptIds"), // JSON array of independent system prompt IDs
    systemPromptSetIds: text("systemPromptSetIds"), // JSON array of prompt set IDs
    parallelWorkers: integer("parallelWorkers").notNull().default(1),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
})

export const benchmarks = sqliteTable("benchmark", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    runId: text("runId")
        .references(() => benchmarkRuns.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    status: text("status", { enum: ["idle", "running", "completed", "failed", "cancelled"] }).notNull().default("idle"),
    startedAt: integer("startedAt", { mode: "timestamp_ms" }),
    completedAt: integer("completedAt", { mode: "timestamp_ms" }),
    parallelWorkers: integer("parallelWorkers").notNull().default(1),
    totalEntries: integer("totalEntries").notNull().default(0),
    completedEntries: integer("completedEntries").notNull().default(0),
})

export const benchmarkEntries = sqliteTable("benchmark_entry", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    benchmarkId: text("benchmarkId")
        .notNull()
        .references(() => benchmarks.id, { onDelete: "cascade" }),
    model: text("model").notNull(),
    contextGroupId: text("contextGroupId")
        .notNull(),
    category: text("category"),
    score: integer("score"),
    metrics: text("metrics"), // JSON string
    prompt: text("prompt"),
    systemContext: text("systemContext"),
    status: text("status", { enum: ["pending", "preparing", "running", "completed", "failed", "cancelled"] }).notNull().default("pending"),
    output: text("output"),
    error: text("error"),
    duration: integer("duration"), // in ms
    systemPromptId: text("systemPromptId"),
    startedAt: integer("startedAt", { mode: "timestamp_ms" }),
    completedAt: integer("completedAt", { mode: "timestamp_ms" }),
})