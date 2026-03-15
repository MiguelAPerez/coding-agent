import { DiscordBot } from "../discord";
import { ChatService } from "@/lib/chat/service";
import { InferenceService } from "@/lib/chat/inference-service";
import { db } from "@/../db";

jest.mock("@/auth", () => ({
    authOptions: {},
}));

jest.mock("discord.js", () => ({
    Client: jest.fn().mockImplementation(() => ({
        on: jest.fn(),
        user: { id: "bot123" },
    })),
    GatewayIntentBits: {
        Guilds: 1,
        GuildMessages: 2,
        DirectMessages: 4,
    },
    TextChannel: class { },
}));

jest.mock("@/lib/chat/service");
jest.mock("@/lib/chat/inference-service");
jest.mock("@/../db", () => ({
    db: {
        query: {
            users: {
                findFirst: jest.fn(),
            },
            agentConfigurations: {
                findFirst: jest.fn(),
            },
        },
        update: jest.fn().mockReturnValue({
            set: jest.fn().mockReturnValue({
                where: jest.fn().mockReturnThis(),
            }),
        }),
    },
}));

describe("DiscordBot agentId Fallback Logic", () => {
    let bot: DiscordBot;
    const userId = "user123";
    const connectionId = "conn123";
    const token = "mock-token";

    beforeEach(() => {
        jest.clearAllMocks();
        // jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((console.log as any).mockRestore) (console.log as any).mockRestore();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((console.error as any).mockRestore) (console.error as any).mockRestore();
    });

    it("should use agentId from chat if present", async () => {
        const testMetadata = JSON.stringify({ channels: { "channel123": { name: "general", enabled: true } } });
        bot = new DiscordBot(token, userId, connectionId, "chat-agent-id", testMetadata);
        const mockMessage = {
            id: "msg101",
            author: { bot: false },
            content: "hello @bot",
            mentions: { has: jest.fn(() => true) },
            reference: null,
            channel: { id: "channel123", name: "general", sendTyping: jest.fn() },
            reply: jest.fn().mockResolvedValue({ id: "reply-id" }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;

        (ChatService.getOrCreateChat as jest.Mock).mockResolvedValue({
            id: "chat-id",
            agentId: "chat-agent-id",
        });

        (ChatService.getChatHistory as jest.Mock).mockResolvedValue([]);
        (InferenceService.runInference as jest.Mock).mockResolvedValue({ message: "response" });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handleMessage = (bot as any).handleMessage.bind(bot);
        await handleMessage(mockMessage);

        expect(InferenceService.runInference).toHaveBeenCalledWith(
            userId,
            null,
            "chat-agent-id",
            expect.anything(),
            "DISCORD",
            expect.anything(),
            null,
            null
        );
    });

    it("should use connection-specific agentId if chat has no agentId", async () => {
        const testMetadata = JSON.stringify({ channels: { "channel123": { name: "general", enabled: true } } });
        bot = new DiscordBot(token, userId, connectionId, "connection-agent-id", testMetadata);
        const mockMessage = {
            id: "msg101",
            author: { bot: false },
            content: "hello @bot",
            mentions: { has: jest.fn(() => true) },
            reference: null,
            channel: { id: "channel123", name: "general", sendTyping: jest.fn() },
            reply: jest.fn().mockResolvedValue({ id: "reply-id" }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;

        (ChatService.getOrCreateChat as jest.Mock).mockResolvedValue({
            id: "chat-id",
            agentId: null,
        });

        (ChatService.getChatHistory as jest.Mock).mockResolvedValue([]);
        (InferenceService.runInference as jest.Mock).mockResolvedValue({ message: "response" });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handleMessage = (bot as any).handleMessage.bind(bot);
        await handleMessage(mockMessage);

        expect(InferenceService.runInference).toHaveBeenCalledWith(
            userId,
            null,
            "connection-agent-id",
            expect.anything(),
            "DISCORD",
            expect.anything(),
            null,
            null
        );
    });

    it("should fallback to first user agent if neither chat nor connection has agentId", async () => {
        const testMetadata = JSON.stringify({ channels: { "channel123": { name: "general", enabled: true } } });
        bot = new DiscordBot(token, userId, connectionId, null, testMetadata);
        const mockMessage = {
            id: "msg101",
            author: { bot: false },
            content: "hello @bot",
            mentions: { has: jest.fn(() => true) },
            reference: null,
            channel: { id: "channel123", name: "general", sendTyping: jest.fn() },
            reply: jest.fn().mockResolvedValue({ id: "reply-id" }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;

        (ChatService.getOrCreateChat as jest.Mock).mockResolvedValue({
            id: "chat-id",
            agentId: null,
        });

        (db.query.agentConfigurations.findFirst as jest.Mock).mockResolvedValue({
            id: "fallback-agent-id",
        });

        (ChatService.getChatHistory as jest.Mock).mockResolvedValue([]);
        (InferenceService.runInference as jest.Mock).mockResolvedValue({ message: "response" });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handleMessage = (bot as any).handleMessage.bind(bot);
        await handleMessage(mockMessage);

        expect(db.query.agentConfigurations.findFirst).toHaveBeenCalled();
        expect(InferenceService.runInference).toHaveBeenCalledWith(
            userId,
            null,
            "fallback-agent-id",
            expect.anything(),
            "DISCORD",
            expect.anything(),
            null,
            null
        );
    });

    it("should reply with error if no agent is found at all", async () => {
        const testMetadata = JSON.stringify({ channels: { "channel123": { name: "general", enabled: true } } });
        bot = new DiscordBot(token, userId, connectionId, null, testMetadata);
        const mockMessage = {
            id: "msg101",
            author: { bot: false },
            content: "hello @bot",
            mentions: { has: jest.fn(() => true) },
            reference: null,
            channel: { id: "channel123", name: "general", sendTyping: jest.fn() },
            reply: jest.fn().mockResolvedValue({ id: "reply-id" }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;

        (ChatService.getOrCreateChat as jest.Mock).mockResolvedValue({
            id: "chat-id",
            agentId: null,
        });

        (db.query.agentConfigurations.findFirst as jest.Mock).mockResolvedValue(null);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handleMessage = (bot as any).handleMessage.bind(bot);
        await handleMessage(mockMessage);

        expect(mockMessage.reply).toHaveBeenCalledWith(expect.stringContaining("No agent configured"));
        expect(InferenceService.runInference).not.toHaveBeenCalled();
    });
});
