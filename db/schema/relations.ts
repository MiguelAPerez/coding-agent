import { relations } from "drizzle-orm"
import { users, accounts, sessions, userPermissions } from "./core"
import { repositories, githubConfigurations } from "./git"
import { agentConfigurations } from "./ai"
import { chats, messages } from "./chat"

export const chatsRelations = relations(chats, ({ one, many }) => ({
    user: one(users, {
        fields: [chats.userId],
        references: [users.id],
    }),
    agent: one(agentConfigurations, {
        fields: [chats.agentId],
        references: [agentConfigurations.id],
    }),
    messages: many(messages),
}))

export const messagesRelations = relations(messages, ({ one }) => ({
    chat: one(chats, {
        fields: [messages.chatId],
        references: [chats.id],
    }),
}))


export const usersRelations = relations(users, ({ one, many }) => ({
    configRepository: one(repositories, {
        fields: [users.configRepositoryId],
        references: [repositories.id],
    }),
    accounts: many(accounts),
    sessions: many(sessions),
    permissions: many(userPermissions),
    chats: many(chats),
}))

export const repositoriesRelations = relations(repositories, ({ one }) => ({
    user: one(users, {
        fields: [repositories.userId],
        references: [users.id],
    }),
    githubConfig: one(githubConfigurations, {
        fields: [repositories.githubConfigurationId],
        references: [githubConfigurations.id],
    })
}))