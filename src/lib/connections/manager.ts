import { Client, GatewayIntentBits, Message, TextChannel } from "discord.js";
import { ChatService } from "@/lib/chat/service";
import { chatWithAgentInternal, getPromptFromFile } from "@/app/actions/chat";
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
                const user = await db.query.users.findFirst({
                    where: (u, { eq }) => eq(u.id, this.userId),
                });
                agentId = user?.defaultAgentId || null;

                if (!agentId) {
                    const firstAgent = await db.query.agentConfigurations.findFirst({
                        where: (agent, { eq }) => eq(agent.userId, this.userId),
                    });
                    agentId = firstAgent?.id || null;
                }
            }

            let repoId: string | null = chat.repoId;
            if (!repoId) {
                const defaultRepo = await db.query.repositories.findFirst({
                    where: (repo, { eq }) => eq(repo.userId, this.userId),
                });
                repoId = defaultRepo?.id || null;
            }

            if (!agentId) {
                await message.reply("Internal Error: No agent configured for this user. Please create an agent in the dashboard.");
                return;
            }

            // Get history for context
            const history = await ChatService.getChatHistory(chat.id);
            const chatMessages = history.map(h => ({ role: h.role, content: h.content }));

            // Trigger agent inference
            if ("sendTyping" in message.channel) {
                await message.channel.sendTyping();
            }

            const discordPrompt = await getPromptFromFile("DISCORD");

            const response = await chatWithAgentInternal(
                repoId as string, // Cast for type safety, context handles null
                null, // No specific file path from Discord yet
                message.content,
                agentId,
                this.userId,
                chatMessages,
                discordPrompt
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
        console.log("[ConnectionManager] Starting all enabled connections...");
        const activeConnections = await db.query.connections.findMany({
            where: (conn, { eq }) => eq(conn.enabled, true),
        });

        console.log(`[ConnectionManager] Found ${activeConnections.length} active connections.`);
        for (const conn of activeConnections) {
            await this.startConnection(conn.id, conn.type, conn.userId, conn.config);
        }
    }

    async startConnection(id: string, type: string, userId: string, configJson: string) {
        if (this.bots.has(id)) {
            console.log(`[ConnectionManager] Connection ${id} already running.`);
            return;
        }

        try {
            console.log(`[ConnectionManager] Starting connection ${id} (${type})...`);
            const config = JSON.parse(configJson);
            if (type === "discord" && config.token) {
                const bot = new DiscordBot(config.token, userId, id);
                await bot.start();
                this.bots.set(id, bot);
                console.log(`[ConnectionManager] Discord bot started successfully for connection ${id}.`);
            } else {
                console.warn(`[ConnectionManager] Unsupported connection type or missing token: ${type}`);
            }
        } catch (error) {
            console.error(`[ConnectionManager] Failed to start connection ${id}:`, error);
        }
    }

    async stopConnection(id: string) {
        const bot = this.bots.get(id);
        if (bot) {
            console.log(`[ConnectionManager] Stopping connection ${id}...`);
            await bot.stop();
            this.bots.delete(id);
            console.log(`[ConnectionManager] Connection ${id} stopped.`);
        }
    }

    getStatus() {
        const status: Record<string, { type: string, status: string }> = {};
        for (const [id] of this.bots.entries()) {
            status[id] = {
                type: "discord",
                status: "online"
            };
        }
        return status;
    }
}
