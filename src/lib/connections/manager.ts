import { db } from "@/../db";
import { DiscordBot } from "./discord";

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
