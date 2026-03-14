import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { users } from "./core"

export const githubConfigurations = sqliteTable("github_configuration", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId").notNull(),
    name: text("name").notNull(), // Friendly name for this GitHub App config
    appId: text("appId").notNull(),
    clientId: text("clientId").notNull(),
    clientSecret: text("clientSecret").notNull(),
    privateKey: text("privateKey").notNull(),
    installationId: text("installationId"), // Optional, can be fetched if needed
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
})

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


export const repositories = sqliteTable("repository", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId").notNull(),
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
