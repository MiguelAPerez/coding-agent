/* eslint-disable @typescript-eslint/no-explicit-any */
import { GET, POST } from "../route";
import { getServerSession } from "next-auth/next";
import { db } from "@/../db";
import { ConnectionManager } from "@/lib/connections/manager";
import { NextResponse } from "next/server";

// Mock next-auth
jest.mock("next-auth/next", () => ({
    getServerSession: jest.fn(),
}));

// Mock @/auth
jest.mock("@/auth", () => ({
    authOptions: {},
}));

// Mock DB
jest.mock("@/../db", () => ({
    db: {
        query: {
            connections: {
                findMany: jest.fn(),
            },
        },
        insert: jest.fn(),
    },
}));

// Mock ConnectionManager
jest.mock("@/lib/connections/manager", () => ({
    ConnectionManager: {
        getInstance: jest.fn().mockReturnValue({
            startConnection: jest.fn(),
        }),
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

describe("GET /api/connections", () => {
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
    });

    test("returns user connections if session exists", async () => {
        const mockSession = { user: { id: "user-1" } };
        const mockConns = [{ id: "conn-1", name: "Discord" }];
        
        (getServerSession as jest.Mock).mockResolvedValue(mockSession);
        (db.query.connections.findMany as jest.Mock).mockResolvedValue(mockConns);

        await GET();

        expect(db.query.connections.findMany).toHaveBeenCalled();
        expect(NextResponse.json).toHaveBeenCalledWith(mockConns);
    });

    test("returns 500 if DB error occurs", async () => {
        (getServerSession as jest.Mock).mockResolvedValue({ user: { id: "u1" } });
        (db.query.connections.findMany as jest.Mock).mockRejectedValue(new Error("DB error"));

        const response: any = await GET();
        expect(response.status).toBe(500);
    });
});

describe("POST /api/connections", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        (console.error as jest.Mock).mockRestore();
    });

    test("returns 401 if no session", async () => {
        (getServerSession as jest.Mock).mockResolvedValue(null);
        const response: any = await POST({} as any);
        expect(response.status).toBe(401);
    });

    test("inserts new connection and starts it", async () => {
        const mockSession = { user: { id: "user-1" } };
        const payload = { type: "discord", name: "My Bot", config: {}, agentId: "agent-1" };
        const mockConn = { id: "conn-1", ...payload };

        (getServerSession as jest.Mock).mockResolvedValue(mockSession);
        
        const mockInsert = {
            values: jest.fn().mockReturnThis(),
            returning: jest.fn().mockResolvedValue([mockConn]),
        };
        (db.insert as jest.Mock).mockReturnValue(mockInsert);

        const req: any = {
            json: jest.fn().mockResolvedValue(payload),
        };

        await POST(req);

        expect(db.insert).toHaveBeenCalled();
        expect(ConnectionManager.getInstance().startConnection).toHaveBeenCalledWith(
            "conn-1", "discord", "user-1", {}, "agent-1"
        );
        expect(NextResponse.json).toHaveBeenCalledWith(mockConn);
    });

    test("returns 500 if insertion fails", async () => {
        (getServerSession as jest.Mock).mockResolvedValue({ user: { id: "u1" } });
        (db.insert as jest.Mock).mockImplementation(() => { throw new Error("Insert failed"); });

        const req: any = { json: jest.fn().mockResolvedValue({}) };
        const response: any = await POST(req);

        expect(response.status).toBe(500);
    });
});
