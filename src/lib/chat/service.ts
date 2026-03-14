import { db } from "@/../db";
import { chats, messages } from "@/../db/schema";
import { eq, desc } from "drizzle-orm";

export interface CreateChatParams {
    userId: string;
    agentId?: string;
    repoId?: string;
    type: "web" | "discord";
    externalId?: string;
    title?: string;
}

export interface SaveMessageParams {
    chatId: string;
    role: "system" | "user" | "assistant";
    content: string;
    externalId?: string;
}

export const ChatService = {
    async createChat(params: CreateChatParams) {
        const [chat] = await db.insert(chats).values({
            userId: params.userId,
            agentId: params.agentId,
            repoId: params.repoId,
            type: params.type,
            externalId: params.externalId,
            title: params.title || "New Chat",
        }).returning();
        return chat;
    },

    async getOrCreateChat(params: CreateChatParams) {
        if (params.type === "discord" && params.externalId) {
            const existing = await db.query.chats.findFirst({
                where: eq(chats.externalId, params.externalId),
            });
            if (existing) return existing;
        }
        return this.createChat(params);
    },

    async saveMessage(params: SaveMessageParams) {
        let message;
        if (params.externalId) {
            const existing = await db.query.messages.findFirst({
                where: eq(messages.externalId, params.externalId),
            });
            if (existing) {
                [message] = await db.update(messages)
                    .set({
                        chatId: params.chatId,
                        role: params.role,
                        content: params.content,
                    })
                    .where(eq(messages.id, existing.id))
                    .returning();
            }
        }

        if (!message) {
            [message] = await db.insert(messages).values({
                chatId: params.chatId,
                role: params.role,
                content: params.content,
                externalId: params.externalId,
            }).returning();
        }

        // Update chat updatedAt
        await db.update(chats)
            .set({ updatedAt: new Date() })
            .where(eq(chats.id, params.chatId));

        return message;
    },

    async getChatHistory(chatId: string) {
        return await db.query.messages.findMany({
            where: eq(messages.chatId, chatId),
            orderBy: (messages, { asc }) => [asc(messages.createdAt)],
        });
    },

    async getMessageByExternalId(externalId: string) {
        return await db.query.messages.findFirst({
            where: eq(messages.externalId, externalId),
        });
    },

    async getUserChats(userId: string) {
        return await db.query.chats.findMany({
            where: eq(chats.userId, userId),
            orderBy: [desc(chats.updatedAt)],
        });
    },

    async getChat(chatId: string) {
        return await db.query.chats.findFirst({
            where: eq(chats.id, chatId),
            with: {
                messages: true,
            },
        });
    }
};
