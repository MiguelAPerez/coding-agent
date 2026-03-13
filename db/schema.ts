import { integer, sqliteTable, text, primaryKey, real } from "drizzle-orm/sqlite-core"
import { relations } from "drizzle-orm"
import type { AdapterAccount } from "next-auth/adapters"

export const users = sqliteTable("user", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    name: text("name"),
    username: text("username").notNull().unique(),
    email: text("email").notNull(),
    emailVerified: integer("emailVerified", { mode: "timestamp_ms" }),
    image: text("image"),
    password: text("password"),
    configRepositoryId: text("configRepositoryId"),
    mainBranchProtected: integer("mainBranchProtected", { mode: "boolean" }).notNull().default(true),
})

export const usersRelations = relations(users, ({ one }) => ({
    configRepository: one(repositories, {
        fields: [users.configRepositoryId],
        references: [repositories.id],
    }),
}))

export const accounts = sqliteTable(
    "account",
    {
        userId: text("userId")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        type: text("type").$type<AdapterAccount["type"]>().notNull(),
        provider: text("provider").notNull(),
        providerAccountId: text("providerAccountId").notNull(),
        refresh_token: text("refresh_token"),
        access_token: text("access_token"),
        expires_at: integer("expires_at"),
        token_type: text("token_type"),
        scope: text("scope"),
        id_token: text("id_token"),
        session_state: text("session_state"),
    },
    (account) => ({
        compoundKey: primaryKey({
            columns: [account.provider, account.providerAccountId],
        }),
    })
)

export const sessions = sqliteTable("session", {
    sessionToken: text("sessionToken").primaryKey(),
    userId: text("userId")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
})

export const verificationTokens = sqliteTable(
    "verificationToken",
    {
        identifier: text("identifier").notNull(),
        token: text("token").notNull(),
        expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
    },
    (vt) => ({
        compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
    })
)

export const permissions = sqliteTable("permission", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull().unique(), // e.g., 'posts:write'
    description: text("description"), // e.g., 'Can create and edit posts'
})

export const userPermissions = sqliteTable(
    "user_permission",
    {
        userId: text("userId")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        permissionId: text("permissionId")
            .notNull()
            .references(() => permissions.id, { onDelete: "cascade" }),
    },
    (up) => ({
        compoundKey: primaryKey({ columns: [up.userId, up.permissionId] }),
    })
)

export const giteaConfigurations = sqliteTable("gitea_configuration", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
        .notNull()
        .unique()
        .references(() => users.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    username: text("username").notNull(),
    token: text("token").notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
})

export const ollamaConfigurations = sqliteTable("ollama_configuration", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
        .notNull()
        .unique()
        .references(() => users.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
})

export const githubConfigurations = sqliteTable("github_configuration", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // Friendly name for this GitHub App config
    appId: text("appId").notNull(),
    clientId: text("clientId").notNull(),
    clientSecret: text("clientSecret").notNull(),
    privateKey: text("privateKey").notNull(),
    installationId: text("installationId"), // Optional, can be fetched if needed
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
})

export const ollamaModels = sqliteTable("ollama_model", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    details: text("details"), // JSON string for metadata
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
})

export const repositories = sqliteTable("repository", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    source: text("source").notNull(), // 'gitea', 'github'
    externalId: text("externalId").notNull(),
    name: text("name").notNull(),
    fullName: text("fullName").notNull(),
    description: text("description"),
    url: text("url").notNull(),
    stars: integer("stars").default(0),
    forks: integer("forks").default(0),
    language: text("language"),
    topics: text("topics"), // JSON string array
    lastAnalyzedHash: text("lastAnalyzedHash"),
    docsMetadata: text("docs_metadata"), // JSON string
    agentMetadata: text("agent_metadata"), // JSON string
    analyzedAt: integer("analyzedAt", { mode: "timestamp_ms" }),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
    cachedAt: integer("cachedAt", { mode: "timestamp_ms" }).notNull(),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
    githubConfigurationId: text("githubConfigurationId").references(() => githubConfigurations.id, { onDelete: "set null" }),
})

export const agentConfigurations = sqliteTable("agent_configuration", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    model: text("model").notNull().default(""),
    systemPromptId: text("systemPromptId").references(() => systemPrompts.id),
    systemPrompt: text("systemPrompt").notNull().default("You are a helpful coding assistant."),
    temperature: integer("temperature").notNull().default(70), // scaled by 100
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
})

export const skills = sqliteTable("skill", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    agentId: text("agentId").references(() => agentConfigurations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull(),
    content: text("content").notNull(),
    isEnabled: integer("isEnabled", { mode: "boolean" }).notNull().default(true),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
})

export const tools = sqliteTable("tool", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    agentId: text("agentId").references(() => agentConfigurations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull(),
    schema: text("schema").notNull(), // stringified JSON schema
    isEnabled: integer("isEnabled", { mode: "boolean" }).notNull().default(true),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
})

export const contextGroups = sqliteTable("context_group", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    category: text("category"),
    expectations: text("expectations"), // JSON array of expectation objects
    weight: real("weight"),
    maxSentences: integer("maxSentences"),
    systemContext: text("systemContext"),
    promptTemplate: text("promptTemplate").notNull(),
    skillIds: text("skillIds"), // JSON string array
    toolIds: text("toolIds"),   // JSON string array
    systemPromptIds: text("systemPromptIds"), // JSON string array
    systemPromptSetIds: text("systemPromptSetIds"), // JSON string array
    systemPromptVariations: text("systemPromptVariations"), // JSON string array of { id, name, systemPrompt }
    updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export const systemPrompts = sqliteTable("system_prompt", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    content: text("content").notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
})

export const systemPromptSets = sqliteTable("system_prompt_set", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    systemPromptIds: text("systemPromptIds").notNull(), // JSON array of system prompt IDs
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
})

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
