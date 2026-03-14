import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { users } from "./core"
import { agentConfigurations } from "./ai"
import { repositories } from "./git"

export const chats = sqliteTable("chat", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    agentId: text("agentId")
        .references(() => agentConfigurations.id, { onDelete: "set null" }),
    repoId: text("repoId")
        .references(() => repositories.id, { onDelete: "set null" }),
    type: text("type", { enum: ["web", "discord"] }).notNull().default("web"),
    externalId: text("externalId"), // e.g. Discord channel ID
    title: text("title"),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
})

export const messages = sqliteTable("message", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    chatId: text("chatId")
        .notNull()
        .references(() => chats.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["system", "user", "assistant"] }).notNull(),
    content: text("content").notNull(),
    externalId: text("externalId"), // e.g. Discord message ID
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
})