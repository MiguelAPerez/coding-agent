import { DiscordBot } from "../discord";
import { ChatService } from "@/lib/chat/service";
import { chatWithAgentInternal } from "@/app/actions/chat";
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
jest.mock("@/app/actions/chat");
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
    },
}));

describe("DiscordBot agentId Fallback Logic", () => {
    let bot: DiscordBot;
    const userId = "user123";
    const connectionId = "conn123";
    const token = "mock-token";

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        (console.log as jest.Mock).mockRestore();
        (console.error as jest.Mock).mockRestore();
    });

    it("should use agentId from chat if present", async () => {
        bot = new DiscordBot(token, userId, connectionId, "connection-agent-id");
        const mockMessage = {
            id: "msg101",
            author: { bot: false },
            content: "hello @bot",
            mentions: { has: jest.fn(() => true) },
            reference: null,
            channelId: "channel123",
            channel: { name: "general", sendTyping: jest.fn() },
            reply: jest.fn().mockResolvedValue({ id: "reply-id" }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;

        (ChatService.getOrCreateChat as jest.Mock).mockResolvedValue({
            id: "chat-id",
            agentId: "chat-agent-id",
        });

        (ChatService.getChatHistory as jest.Mock).mockResolvedValue([]);
        (chatWithAgentInternal as jest.Mock).mockResolvedValue({ message: "response" });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handleMessage = (bot as any).handleMessage.bind(bot);
        await handleMessage(mockMessage);

        expect(chatWithAgentInternal).toHaveBeenCalledWith(
            "chat-agent-id",
            expect.anything(),
            expect.anything(),
            expect.anything(),
            null,
            null,
            null,
            expect.anything()
        );
    });

    it("should use connection-specific agentId if chat has no agentId", async () => {
        bot = new DiscordBot(token, userId, connectionId, "connection-agent-id");
        const mockMessage = {
            id: "msg101",
            author: { bot: false },
            content: "hello @bot",
            mentions: { has: jest.fn(() => true) },
            reference: null,
            channelId: "channel123",
            channel: { name: "general", sendTyping: jest.fn() },
            reply: jest.fn().mockResolvedValue({ id: "reply-id" }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;

        (ChatService.getOrCreateChat as jest.Mock).mockResolvedValue({
            id: "chat-id",
            agentId: null,
        });

        (ChatService.getChatHistory as jest.Mock).mockResolvedValue([]);
        (chatWithAgentInternal as jest.Mock).mockResolvedValue({ message: "response" });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handleMessage = (bot as any).handleMessage.bind(bot);
        await handleMessage(mockMessage);

        expect(chatWithAgentInternal).toHaveBeenCalledWith(
            "connection-agent-id",
            expect.anything(),
            expect.anything(),
            expect.anything(),
            null,
            null,
            null,
            expect.anything()
        );
    });

    it("should fallback to first user agent if neither chat nor connection has agentId", async () => {
        bot = new DiscordBot(token, userId, connectionId, null);
        const mockMessage = {
            id: "msg101",
            author: { bot: false },
            content: "hello @bot",
            mentions: { has: jest.fn(() => true) },
            reference: null,
            channelId: "channel123",
            channel: { name: "general", sendTyping: jest.fn() },
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
        (chatWithAgentInternal as jest.Mock).mockResolvedValue({ message: "response" });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handleMessage = (bot as any).handleMessage.bind(bot);
        await handleMessage(mockMessage);

        expect(db.query.agentConfigurations.findFirst).toHaveBeenCalled();
        expect(chatWithAgentInternal).toHaveBeenCalledWith(
            "fallback-agent-id",
            expect.anything(),
            expect.anything(),
            expect.anything(),
            null,
            null,
            null,
            expect.anything()
        );
    });

    it("should reply with error if no agent is found at all", async () => {
        bot = new DiscordBot(token, userId, connectionId, null);
        const mockMessage = {
            id: "msg101",
            author: { bot: false },
            content: "hello @bot",
            mentions: { has: jest.fn(() => true) },
            reference: null,
            channelId: "channel123",
            channel: { name: "general", sendTyping: jest.fn() },
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
        expect(chatWithAgentInternal).not.toHaveBeenCalled();
    });
});
