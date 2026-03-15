/* eslint-disable @typescript-eslint/no-explicit-any */
import { GET, POST } from "../route";
import { getServerSession } from "next-auth/next";
import { ChatService } from "@/lib/chat/service";
import { NextResponse } from "next/server";

// Mock next-auth
jest.mock("next-auth/next", () => ({
    getServerSession: jest.fn(),
}));

// Mock @/auth
jest.mock("@/auth", () => ({
    authOptions: {},
}));

// Mock ChatService
jest.mock("@/lib/chat/service", () => ({
    ChatService: {
        getUserChats: jest.fn(),
        createChat: jest.fn(),
    },
}));

// Mock NextResponse
jest.mock("next/server", () => ({
    NextResponse: {
        json: jest.fn().mockImplementation((data, init) => ({
            ...init,
            json: async () => data,
        })),
    },
}));

describe("GET /api/chats", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        (console.error as jest.Mock).mockRestore();
    });

    test("returns 401 if no session", async () => {
        (getServerSession as jest.Mock).mockResolvedValue(null);

        const response: any = await GET();

        expect(response.status).toBe(401);
        expect(NextResponse.json).toHaveBeenCalledWith(
            { error: "Unauthorized" },
            { status: 401 }
        );
    });

    test("returns user chats if session exists", async () => {
        const mockSession = { user: { id: "user-1" } };
        const mockChats = [{ id: "chat-1", title: "Test Chat" }];
        
        (getServerSession as jest.Mock).mockResolvedValue(mockSession);
        (ChatService.getUserChats as jest.Mock).mockResolvedValue(mockChats);

        await GET();

        expect(ChatService.getUserChats).toHaveBeenCalledWith("user-1");
        expect(NextResponse.json).toHaveBeenCalledWith(mockChats);
    });

    test("returns 500 if error occurs", async () => {
        (getServerSession as jest.Mock).mockResolvedValue({ user: { id: "u1" } });
        (ChatService.getUserChats as jest.Mock).mockRejectedValue(new Error("DB Error"));

        const response: any = await GET();

        expect(response.status).toBe(500);
        expect(NextResponse.json).toHaveBeenCalledWith(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    });
});

describe("POST /api/chats", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        (console.error as jest.Mock).mockRestore();
    });

    test("returns 401 if no session", async () => {
        (getServerSession as jest.Mock).mockResolvedValue(null);
        const req: any = { json: jest.fn() };

        const response: any = await POST(req);

        expect(response.status).toBe(401);
    });

    test("creates and returns a new chat", async () => {
        const mockSession = { user: { id: "user-1" } };
        const payload = { agentId: "agent-1", repoId: "repo-1", title: "New Chat" };
        const mockChat = { id: "chat-1", ...payload };

        (getServerSession as jest.Mock).mockResolvedValue(mockSession);
        (ChatService.createChat as jest.Mock).mockResolvedValue(mockChat);

        const req: any = {
            json: jest.fn().mockResolvedValue(payload),
        };

        await POST(req);

        expect(ChatService.createChat).toHaveBeenCalledWith({
            userId: "user-1",
            ...payload,
            type: "web",
        });
        expect(NextResponse.json).toHaveBeenCalledWith(mockChat);
    });

    test("returns 500 if error occurs during creation", async () => {
        (getServerSession as jest.Mock).mockResolvedValue({ user: { id: "u1" } });
        const req: any = { json: jest.fn().mockResolvedValue({}) };
        (ChatService.createChat as jest.Mock).mockRejectedValue(new Error("Fail"));

        const response: any = await POST(req);

        expect(response.status).toBe(500);
    });
});
