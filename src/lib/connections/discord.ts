import { Client, GatewayIntentBits, Message } from "discord.js";
import { ChatService } from "@/lib/chat/service";
import { chatWithAgentInternal } from "@/app/actions/chat";
import { ChatResponse } from "@/lib/chat/types";
import { db } from "@/../db";
import { chats } from "@/../db/schema";
import { InferSelectModel } from "drizzle-orm";
import { trace, SpanStatusCode } from "@opentelemetry/api";

const tracer = trace.getTracer("discord-chat");

export class DiscordBot {
    private client: Client;
    private token: string;
    private userId: string;
    private connectionId: string;
    private agentId: string | null;

    constructor(token: string, userId: string, connectionId: string, agentId: string | null = null) {
        this.token = token;
        this.userId = userId;
        this.connectionId = connectionId;
        this.agentId = agentId;
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.DirectMessages,
            ],
        });

        this.client.on("messageCreate", this.handleMessage.bind(this));
        this.client.on("ready", () => {
            console.log(`Logged in as ${this.client.user?.tag}! Connection ID: ${this.connectionId}`);
        });
    }

    async start() {
        console.log(`[DiscordBot] Attempting login for connection ${this.connectionId}...`);
        await this.client.login(this.token);
        console.log(`[DiscordBot] Login call completed for connection ${this.connectionId}.`);
    }

    async stop() {
        await this.client.destroy();
    }

    private async handleMessage(message: Message) {
        if (message.author.bot) return;

        // Only respond if mentioned or if it's a reply
        const isMentioned = this.client.user && message.mentions.has(this.client.user);
        const isReply = !!message.reference?.messageId;
        const isThread = message.channel && 'isThread' in message.channel && typeof message.channel.isThread === 'function'
            ? message.channel.isThread()
            : false;

        if (!isMentioned && !isReply) return;
        return tracer.startActiveSpan("discord.message", async (span) => {
            try {
                await message;
                if (!message.content) throw new Error("Empty message");

                let chat: InferSelectModel<typeof chats> | undefined;
                let chainRootId: string = message.id;
                let isChainOurs = isMentioned;

                // --- Reply Chain Tracing ---
                if (isReply && message.reference?.messageId) {
                    let traceId: string | undefined = message.reference.messageId;
                    let depth = 0;
                    const MAX_DEPTH = 10;

                    while (traceId && depth < MAX_DEPTH) {
                        depth++;
                        // 1. Check DB first
                        const dbMsg = await ChatService.getMessageByExternalId(traceId);
                        if (dbMsg) {
                            chat = await ChatService.getChat(dbMsg.chatId);
                            isChainOurs = true;
                            break;
                        }

                        // 2. Fetch from Discord to find parent
                        try {
                            const fetched: Message = await message.channel.messages.fetch(traceId);
                            chainRootId = fetched.id;

                            const fromBot = fetched.author.id === this.client.user?.id;
                            const mentionsBot = this.client.user && fetched.mentions.has(this.client.user);

                            if (fromBot || mentionsBot) {
                                isChainOurs = true;
                            }

                            traceId = fetched.reference?.messageId;
                        } catch {
                            break;
                        }
                    }
                }

                // If we found a chat in DB during trace, we are good.
                // If not, but the chain is "ours", create/get a chat based on the chainRootId
                if (!chat && isChainOurs) {
                    chat = await ChatService.getOrCreateChat({
                        userId: this.userId,
                        type: "discord",
                        externalId: chainRootId,
                        title: isThread && 'name' in message.channel ? `Thread: ${message.channel.name}` : `Discord Chain: ${message.content.slice(0, 30)}...`,
                    });
                }

                if (!chat) return;

                // Get default agent and repo if not set in chat
                let agentId: string | null = chat.agentId;
                if (!agentId) {
                    // Use connection-specific agentId if available
                    agentId = this.agentId;

                    if (!agentId) {
                        // Fallback to the first available agent for the user if none linked
                        const firstAgent = await db.query.agentConfigurations.findFirst({
                            where: (agent, { eq }) => eq(agent.userId, this.userId),
                        });
                        agentId = firstAgent?.id || null;
                    }
                }

                if (!agentId) {
                    await message.reply("Internal Error: No agent configured for this user. Please create an agent in the dashboard.");
                    return;
                }

                // Save user message first to persistence
                await ChatService.saveMessage({
                    chatId: chat.id,
                    role: "user",
                    content: message.content,
                    externalId: message.id,
                });

                // Get history for context (including the message we just saved)
                const history = await ChatService.getChatHistory(chat.id);
                const chatMessages = history.map(h => ({ role: h.role as "user" | "assistant" | "system", content: h.content }));

                // Trigger agent inference with persistent typing indicator
                let typingInterval: NodeJS.Timeout | null = null;
                const channel = message.channel;
                const canSendTyping = channel && 'sendTyping' in channel && typeof (channel as unknown as { sendTyping: unknown }).sendTyping === 'function';

                if (canSendTyping) {
                    const sendTyping = (channel as unknown as { sendTyping: () => Promise<void> }).sendTyping.bind(channel);
                    await sendTyping();
                    typingInterval = setInterval(() => {
                        sendTyping().catch(() => { });
                    }, 9000); // Discord typing indicator lasts ~10 seconds
                }

                const startTime = Date.now();
                let response: ChatResponse;
                try {
                    response = await chatWithAgentInternal(
                        agentId,
                        message.content,
                        this.userId,
                        chatMessages,
                        null,
                        null,
                        null,
                        message.channelId,
                    );
                } finally {
                    if (typingInterval) clearInterval(typingInterval);
                }

                const duration = Date.now() - startTime;
                console.log(`[DiscordBot] Inference took ${duration}ms for user ${this.userId}`);

                if (!response.message || response.message.trim() === "") {
                    console.warn("[DiscordBot] Agent returned empty response.");
                    await message.reply("I'm sorry, I couldn't generate a response. Please try again.");
                    return;
                }

                // Send response back to Discord
                const sentMessage = await message.reply(response.message);

                // Save assistant message with its externalId
                await ChatService.saveMessage({
                    chatId: chat.id,
                    role: "assistant",
                    content: response.message,
                    externalId: sentMessage.id,
                });

            } catch (error) {
                console.error("Discord Bot Error:", error);
                span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : "Unknown error" });
                await message.reply("Sorry, I encountered an error processing your request.");
            } finally {
                span.end();
            }
        });
    }
}
