import { integer, sqliteTable, text, real } from "drizzle-orm/sqlite-core"
import { users } from "./core"

export const systemPrompts = sqliteTable("system_prompt", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId").notNull(),
    name: text("name").notNull(),
    content: text("content").notNull(),
    isManaged: integer("isManaged", { mode: "boolean" }).notNull().default(false),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
})

export const agentConfigurations = sqliteTable("agent_configuration", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId").notNull(),
    name: text("name").notNull(),
    provider: text("provider").notNull().default("ollama"),
    model: text("model").notNull().default(""),
    systemPromptId: text("systemPromptId").references(() => systemPrompts.id),
    systemPrompt: text("systemPrompt").notNull().default("You are a helpful coding assistant."),
    temperature: integer("temperature").notNull().default(70), // scaled by 100
    isManaged: integer("isManaged", { mode: "boolean" }).notNull().default(false),
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



export const anthropicConfigurations = sqliteTable("anthropic_configuration", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
        .notNull()
        .unique()
        .references(() => users.id, { onDelete: "cascade" }),
    apiKey: text("apiKey").notNull(),
    totalInputTokens: integer("totalInputTokens").notNull().default(0),
    totalOutputTokens: integer("totalOutputTokens").notNull().default(0),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
})

export const googleConfigurations = sqliteTable("google_configuration", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
        .notNull()
        .unique()
        .references(() => users.id, { onDelete: "cascade" }),
    apiKey: text("apiKey").notNull(),
    totalInputTokens: integer("totalInputTokens").notNull().default(0),
    totalOutputTokens: integer("totalOutputTokens").notNull().default(0),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
})



export const googleModels = sqliteTable("google_model", {
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

export const anthropicModels = sqliteTable("anthropic_model", {
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