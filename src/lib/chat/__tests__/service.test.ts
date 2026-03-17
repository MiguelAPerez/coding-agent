import { ChatService } from "../service";
import { db } from "@/../db";
import { chats, messages } from "@/../db/schema";

// Mock DB
jest.mock("@/../db", () => ({
    db: {
        insert: jest.fn(() => ({
            values: jest.fn(() => ({
                returning: jest.fn(() => [{ id: "chat-123", title: "New Chat" }]),
            })),
        })),
        query: {
            chats: {
                findFirst: jest.fn(),
                findMany: jest.fn(),
            },
            messages: {
                findFirst: jest.fn(),
                findMany: jest.fn(),
            },
        },
        update: jest.fn(() => ({
            set: jest.fn(() => ({
                where: jest.fn(() => ({
                    returning: jest.fn(() => [{ id: "msg-123", content: "updated" }]),
                })),
                returning: jest.fn(() => [{ id: "msg-123" }]),
            })),
            where: jest.fn(() => ({
                run: jest.fn(),
            })),
        })),
        delete: jest.fn(() => ({
            where: jest.fn(() => ({
                run: jest.fn(),
            })),
        })),
    },
}));

describe("ChatService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Reset default insert mock
        (db.insert as jest.Mock).mockReturnValue({
            values: jest.fn(() => ({
                returning: jest.fn(() => [{ id: "chat-123", title: "New Chat" }]),
            })),
        });
    });

    describe("createChat", () => {
        it("should create a new chat", async () => {
            const params = { userId: "user-1", type: "web" as const };
            const result = await ChatService.createChat(params);

            expect(db.insert).toHaveBeenCalled();
            expect(result.id).toBe("chat-123");
        });

        it("should handle empty string agentId by converting to null", async () => {
            const mockValues = jest.fn().mockReturnValue({
                returning: jest.fn(() => [{ id: "chat-empty-agent" }]),
            });
            (db.insert as jest.Mock).mockReturnValue({ values: mockValues });

            await ChatService.createChat({ userId: "u1", type: "web", agentId: "" });

            expect(mockValues).toHaveBeenCalledWith(expect.objectContaining({
                agentId: null
            }));
        });
    });

    describe("getOrCreateChat", () => {
        it("should return existing chat for discord if externalId exists", async () => {
            const mockChat = { id: "chat-456", externalId: "discord-123" };
            (db.query.chats.findFirst as jest.Mock).mockResolvedValue(mockChat);

            const params = { userId: "user-1", type: "discord" as const, externalId: "discord-123" };
            const result = await ChatService.getOrCreateChat(params);

            expect(db.query.chats.findFirst).toHaveBeenCalled();
            expect(result).toEqual(mockChat);
        });

        it("should create new chat if no existing discord chat found", async () => {
            (db.query.chats.findFirst as jest.Mock).mockResolvedValue(null);
            
            const params = { userId: "user-1", type: "discord" as const, externalId: "discord-123" };
            const result = await ChatService.getOrCreateChat(params);

            expect(db.insert).toHaveBeenCalled();
            expect(result.id).toBe("chat-123");
        });
    });

    describe("saveMessage", () => {
        it("should insert a new message", async () => {
            const params = { chatId: "chat-1", role: "user" as const, content: "hello" };
            (db.insert as jest.Mock).mockReturnValue({
                values: jest.fn().mockReturnValue({
                    returning: jest.fn().mockReturnValue([{ id: "msg-1", ...params }])
                })
            });

            const result = await ChatService.saveMessage(params);

            expect(db.insert).toHaveBeenCalledWith(messages);
            expect(db.update).toHaveBeenCalledWith(chats); // Should update chat updatedAt
            expect(result?.id).toBe("msg-1");
        });

        it("should update existing message if externalId exists", async () => {
            const existingMsg = { id: "msg-old", externalId: "ext-1" };
            (db.query.messages.findFirst as jest.Mock).mockResolvedValue(existingMsg);
            
            const params = { chatId: "chat-1", role: "assistant" as const, content: "updated", externalId: "ext-1" };
            
            await ChatService.saveMessage(params);

            expect(db.update).toHaveBeenCalledWith(messages);
        });

        it("should handle FOREIGN KEY constraint failed error gracefully", async () => {
            (db.insert as jest.Mock).mockReturnValue({
                values: jest.fn().mockImplementation(() => {
                    throw new Error("SqliteError: FOREIGN KEY constraint failed");
                })
            });

            const params = { chatId: "non-existent", role: "user" as const, content: "fail" };
            const result = await ChatService.saveMessage(params);

            expect(result).toBeNull();
        });
    });

    describe("getChatHistory", () => {
        it("should fetch messages for a chat", async () => {
            const mockHistory = [{ id: "m1" }, { id: "m2" }];
            (db.query.messages.findMany as jest.Mock).mockResolvedValue(mockHistory);

            const result = await ChatService.getChatHistory("chat-1");
            expect(result).toEqual(mockHistory);
        });
    });

    describe("getChat", () => {
        it("should fetch a chat with messages", async () => {
            const mockChat = { id: "chat-1", messages: [] };
            (db.query.chats.findFirst as jest.Mock).mockResolvedValue(mockChat);

            const result = await ChatService.getChat("chat-1");
            expect(result).toEqual(mockChat);
        });
    });

    describe("deleteChat", () => {
        it("should delete a chat", async () => {
            await ChatService.deleteChat("chat-1");
            expect(db.delete).toHaveBeenCalledWith(chats);
        });
    });
});
