import { integer, sqliteTable, text, primaryKey } from "drizzle-orm/sqlite-core"
import type { AdapterAccount } from "next-auth/adapters"
import { agentConfigurations } from "./ai"
import { repositories } from "./git"

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
    mainBranchProtected: integer("mainBranchProtected", { mode: "boolean" }).notNull().default(true),
    configRepositoryId: text("configRepositoryId").references(() => repositories.id, { onDelete: "set null" }),
    defaultAgentId: text("defaultAgentId").references(() => agentConfigurations.id, { onDelete: "set null" }),
})

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
