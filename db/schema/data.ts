import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { repositories } from "./git"
import { users } from "./core"
import { agentConfigurations } from "./ai"


export const codeEmbeddings = sqliteTable("code_embedding", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    repositoryId: text("repositoryId")
        .notNull()
        .references(() => repositories.id, { onDelete: "cascade" }),
    filePath: text("filePath").notNull(),
    lineNumber: integer("lineNumber").notNull(),
    contentChunk: text("contentChunk").notNull(),
    embedding: text("embedding").notNull(), // JSON string array of floats
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
})

export const backgroundJobs = sqliteTable("background_job", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(), // e.g., 'semantic_index_all'
    status: text("status", { enum: ["running", "completed", "failed"] }).notNull(),
    startedAt: integer("startedAt", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
    completedAt: integer("completedAt", { mode: "timestamp_ms" }),
    error: text("error"),
    details: text("details"), // JSON string for arbitrary metadata
})

export const connections = sqliteTable("connection", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    agentId: text("agentId").references(() => agentConfigurations.id, { onDelete: "set null" }),
    type: text("type", { enum: ["discord"] }).notNull(),
    name: text("name").notNull(),
    config: text("config").notNull(), // JSON string for tokens/config
    metadata: text("metadata"), // JSON string for arbitrary configuration
    tokenLimitDaily: integer("token_limit_daily"),
    tokensUsedToday: integer("tokens_used_today").notNull().default(0),
    tokensLastResetAt: integer("tokens_last_reset_at", { mode: "timestamp_ms" }),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
})

