import { Client, GatewayIntentBits, Message, TextChannel } from "discord.js";
import { ChatService } from "@/lib/chat/service";
import { chatWithAgentInternal } from "@/app/actions/chat";
import { db } from "@/../db";

export class DiscordBot {
    private client: Client;
    private token: string;
    private userId: string;
    private connectionId: string;

    constructor(token: string, userId: string, connectionId: string) {
        this.token = token;
        this.userId = userId;
        this.connectionId = connectionId;
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.DirectMessages,
            ],
        });

        this.client.on("messageCreate", this.handleMessage.bind(this));
        this.client.on("ready", () => {
            console.log(`Logged in as ${this.client.user?.tag}! Connection ID: ${this.connectionId}`);
        });
    }

    async start() {
        await this.client.login(this.token);
    }

    async stop() {
        await this.client.destroy();
    }

    private async handleMessage(message: Message) {
        if (message.author.bot) return;

        try {
            // Get or create chat for this Discord channel
            const chat = await ChatService.getOrCreateChat({
                userId: this.userId,
                type: "discord",
                externalId: message.channelId,
                title: message.channel instanceof TextChannel ? `#${message.channel.name}` : `DM with ${message.author.username}`,
            });

            // Save user message
            await ChatService.saveMessage({
                chatId: chat.id,
                role: "user",
                content: message.content,
            });

            // Get default agent and repo if not set in chat
            // For now, just pick the first ones or use defaults
            let agentId: string | null = chat.agentId;
            if (!agentId) {
                const defaultAgent = await db.query.agentConfigurations.findFirst({
                    where: (agent, { eq }) => eq(agent.userId, this.userId),
                });
                agentId = defaultAgent?.id || null;
            }

            let repoId: string | null = chat.repoId;
            if (!repoId) {
                const defaultRepo = await db.query.repositories.findFirst({
                    where: (repo, { eq }) => eq(repo.userId, this.userId),
                });
                repoId = defaultRepo?.id || null;
            }

            if (!agentId || !repoId) {
                await message.reply("Internal Error: No agent or repository configured for this connection.");
                return;
            }

            // Get history for context
            const history = await ChatService.getChatHistory(chat.id);
            const chatMessages = history.map(h => ({ role: h.role, content: h.content }));

            // Trigger agent inference
            if ("sendTyping" in message.channel) {
                await message.channel.sendTyping();
            }

            const response = await chatWithAgentInternal(
                repoId,
                null, // No specific file path from Discord yet
                message.content,
                agentId,
                this.userId,
                chatMessages
            );

            // Save assistant message
            await ChatService.saveMessage({
                chatId: chat.id,
                role: "assistant",
                content: response.message,
            });

            // Send response back to Discord
            await message.reply(response.message);

        } catch (error) {
            console.error("Discord Bot Error:", error);
            await message.reply("Sorry, I encountered an error processing your request.");
        }
    }
}

export class ConnectionManager {
    private static instance: ConnectionManager;
    private bots: Map<string, DiscordBot> = new Map();

    private constructor() { }

    static getInstance() {
        if (!ConnectionManager.instance) {
            ConnectionManager.instance = new ConnectionManager();
        }
        return ConnectionManager.instance;
    }

    async startAll() {
        const activeConnections = await db.query.connections.findMany({
            where: (conn, { eq }) => eq(conn.enabled, true),
        });

        for (const conn of activeConnections) {
            await this.startConnection(conn.id, conn.type, conn.userId, conn.config);
        }
    }

    async startConnection(id: string, type: string, userId: string, configJson: string) {
        if (this.bots.has(id)) return;

        try {
            const config = JSON.parse(configJson);
            if (type === "discord" && config.token) {
                const bot = new DiscordBot(config.token, userId, id);
                await bot.start();
                this.bots.set(id, bot);
            }
        } catch (error) {
            console.error(`Failed to start connection ${id}:`, error);
        }
    }

    async stopConnection(id: string) {
        const bot = this.bots.get(id);
        if (bot) {
            await bot.stop();
            this.bots.delete(id);
        }
    }
}
