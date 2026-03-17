import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { users } from "./core"
import { agentConfigurations } from "./ai"

export const defaultAgents = sqliteTable("default_agent", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    agentId: text("agentId")
        .notNull()
        .references(() => agentConfigurations.id, { onDelete: "cascade" }),
    page: text("page").notNull(), // e.g., 'chat'
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
})
