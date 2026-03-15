import { DiscordBot } from "../discord";
import { ChatService } from "@/lib/chat/service";
import { chatWithAgentInternal } from "@/app/actions/chat";
import { Message } from "discord.js";

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
    TextChannel: class {},
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

describe("DiscordBot Thread Tracking", () => {
    let bot: DiscordBot;
    const userId = "user123";
    const connectionId = "conn123";
    const token = "mock-token";

    beforeEach(() => {
        jest.clearAllMocks();
        bot = new DiscordBot(token, userId, connectionId);
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        (console.log as jest.Mock).mockRestore();
        (console.error as jest.Mock).mockRestore();
    });

    it("should ignore messages that are not mentions or replies", async () => {
        const mockMessage = {
            author: { bot: false },
            content: "hello",
            mentions: { has: jest.fn(() => false) },
            reference: null,
            channel: { isThread: jest.fn(() => false) },
        } as unknown as Message;

        const handleMessage = (bot as unknown as { handleMessage: (m: Message) => Promise<void> }).handleMessage.bind(bot);
        await handleMessage(mockMessage);

        expect(ChatService.getOrCreateChat).not.toHaveBeenCalled();
    });

    it("should use existing chat if message is a reply to a known message", async () => {
        const parentChatId = "chat456";
        const replyMessageId = "msg789";
        const mockMessage = {
            id: "msg101",
            author: { bot: false },
            content: "follow up",
            mentions: { has: jest.fn(() => false) },
            reference: { messageId: replyMessageId },
            channelId: "channel123",
            channel: { sendTyping: jest.fn() },
            reply: jest.fn().mockResolvedValue({ id: "reply-id" }),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;

        (ChatService.getMessageByExternalId as jest.Mock).mockResolvedValue({
            id: replyMessageId,
            chatId: parentChatId,
            role: "assistant",
            content: "hello",
            createdAt: new Date(),
        });

        (ChatService.getChat as jest.Mock).mockResolvedValue({
            id: parentChatId,
            agentId: "agent123",
        });

        (ChatService.getChatHistory as jest.Mock).mockResolvedValue([]);
        (chatWithAgentInternal as jest.Mock).mockResolvedValue({ message: "response" });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handleMessage = (bot as any).handleMessage.bind(bot);
        await handleMessage(mockMessage);

        expect(ChatService.getChat).toHaveBeenCalledWith(parentChatId);
        expect(ChatService.saveMessage).toHaveBeenCalledWith(expect.objectContaining({
            chatId: parentChatId,
            externalId: mockMessage.id,
        }));
    });

    it("should create new chat if mentioned but not a reply", async () => {
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
            id: "new-chat-id",
            agentId: "agent123",
        });

        (ChatService.getChatHistory as jest.Mock).mockResolvedValue([]);
        (chatWithAgentInternal as jest.Mock).mockResolvedValue({ message: "response" });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handleMessage = (bot as any).handleMessage.bind(bot);
        await handleMessage(mockMessage);

        expect(ChatService.getOrCreateChat).toHaveBeenCalled();
        expect(ChatService.saveMessage).toHaveBeenCalledWith(expect.objectContaining({
            chatId: "new-chat-id",
            externalId: mockMessage.id,
        }));
    });
});
