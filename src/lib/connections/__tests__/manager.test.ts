import { ConnectionManager } from "../manager";
import { DiscordBot } from "../discord";
import { db } from "@/../db";

jest.mock("../discord");
jest.mock("@/auth", () => ({
    authOptions: {},
}));
jest.mock("@/../db", () => ({
    db: {
        query: {
            connections: {
                findMany: jest.fn(),
            },
        },
    },
}));

describe("ConnectionManager", () => {
    let manager: ConnectionManager;

    beforeEach(() => {
        jest.clearAllMocks();
        manager = ConnectionManager.getInstance();
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
        // Reset singleton internal state for testing if possible, 
        // but since it's a private constructor and static instance, 
        // we'll just clear the bots map if we could, but it's private.
        // For now, let's just test getInstance and initial states.
    });

    afterEach(() => {
        (console.log as jest.Mock).mockRestore();
        (console.error as jest.Mock).mockRestore();
    });

    it("should be a singleton", () => {
        const instance1 = ConnectionManager.getInstance();
        const instance2 = ConnectionManager.getInstance();
        expect(instance1).toBe(instance2);
    });

    it("should start enabled connections", async () => {
        const mockConnections = [
            { id: "conn1", type: "discord", userId: "user1", enabled: true, config: JSON.stringify({ token: "token1" }), agentId: "agent123" },
        ];
        (db.query.connections.findMany as jest.Mock).mockResolvedValue(mockConnections);

        jest.spyOn(DiscordBot.prototype, "start").mockResolvedValue();

        await manager.startAll();

        expect(db.query.connections.findMany).toHaveBeenCalled();
        expect(DiscordBot).toHaveBeenCalledWith("token1", "user1", "conn1", "agent123");
    });

    it("should not start disabled connections", async () => {
        (db.query.connections.findMany as jest.Mock).mockResolvedValue([]);
        
        await manager.startAll();
        
        expect(DiscordBot).not.toHaveBeenCalled();
    });

    it("should handle stopping connections", async () => {
        const mockConn = { id: "conn2", type: "discord", userId: "user2", enabled: true, config: JSON.stringify({ token: "token2" }) };
        (db.query.connections.findMany as jest.Mock).mockResolvedValue([mockConn]);
        
        await manager.startAll();
        
        // We need to access the private bots map or verify via the bot instance
        // Since we mocked DiscordBot, we can check its stop method if we can get the instance
        const instances = (DiscordBot as jest.Mock).mock.instances;
        const botInstance = instances[0];
        
        await manager.stopConnection("conn2");
        expect(botInstance.stop).toHaveBeenCalled();
    });
});
