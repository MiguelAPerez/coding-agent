import { ChatContext } from "../context";
import { db } from "@/../db";
import { getRepoFileContentInternal } from "@/lib/repo-utils";

// Mocking dependencies
jest.mock("@/../db", () => ({
    db: {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        get: jest.fn(),
        all: jest.fn(),
    } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
}));

jest.mock("@/lib/repo-utils", () => ({
    getRepoFileContentInternal: jest.fn(),
}));

describe("ChatContext", () => {
    const mockDb = db as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, "warn").mockImplementation(() => {});
        jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("should load context data successfully", async () => {
        mockDb.get
            .mockReturnValueOnce({ id: "o1", userId: "u1" }) // ollama
            .mockReturnValueOnce(null) // anthropic
            .mockReturnValueOnce(null) // google
            .mockReturnValueOnce({ id: "r1", fullName: "user/repo" }) // repo
            .mockReturnValueOnce({ id: "a1", name: "Agent", model: "m1", systemPrompt: "Prompt" }); // agent

        (getRepoFileContentInternal as jest.Mock).mockResolvedValue("---frontmatter---\ncontent");

        const context = new ChatContext("u1", "r1", "a1", "file.ts", ["extra.ts"]);
        const data = await context.load();

        expect(data.agentConfig.id).toBe("a1");
        expect(data.fileContents["file.ts"]).toBe("content");
        expect(data.fileContents["extra.ts"]).toBe("content");
        expect(getRepoFileContentInternal).toHaveBeenCalledTimes(2);
    });

    it("should throw error if repo not found", async () => {
        mockDb.get
            .mockReturnValueOnce({ id: "o1", userId: "u1" }) // ollama
            .mockReturnValueOnce(null) // anthropic
            .mockReturnValueOnce(null) // google
            .mockReturnValueOnce(null); // repo
            
        const context = new ChatContext("u1", "r1");
        await expect(context.load()).rejects.toThrow("Repository not found");
    });

    it("should throw error if no agent found", async () => {
        mockDb.get
            .mockReturnValueOnce({ id: "o1" }) // ollama
            .mockReturnValueOnce(null)
            .mockReturnValueOnce(null)
            .mockReturnValueOnce({ id: "r1" }) // repo
            .mockReturnValueOnce(null); // fallback search
            
        const context = new ChatContext("u1", "r1");
        await expect(context.load()).rejects.toThrow("No AI agents are configured");
    });

    it("should throw error if agent has no model", async () => {
        mockDb.get
            .mockReturnValueOnce({ id: "o1" }) // ollama
            .mockReturnValueOnce(null)
            .mockReturnValueOnce(null)
            .mockReturnValueOnce({ id: "r1" })
            .mockReturnValueOnce({ id: "a1", name: "Agent", model: null });
        const context = new ChatContext("u1", "r1");
        await expect(context.load()).rejects.toThrow("has no model configured");
    });

    it("should fallback to default agent if specific agentId not found", async () => {
        mockDb.get
            .mockReturnValueOnce({ id: "o1" }) // ollama
            .mockReturnValueOnce(null)
            .mockReturnValueOnce(null)
            .mockReturnValueOnce({ id: "r1" }) // repo
            .mockReturnValueOnce(null) // agentId spec search
            .mockReturnValueOnce({ id: "def", name: "Default", model: "m" }); // fallback search

        const context = new ChatContext("u1", "r1", "unknown-agent");
        const data = await context.load();

        expect(data.agentConfig.id).toBe("def");
    });

    it("should load personality prompt from systemPrompts if systemPromptId exists", async () => {
        mockDb.get
            .mockReturnValueOnce({ id: "o1" }) // ollama
            .mockReturnValueOnce(null)
            .mockReturnValueOnce(null)
            .mockReturnValueOnce({ id: "r1" })
            .mockReturnValueOnce({ id: "a1", name: "Agent", model: "m1", systemPromptId: "p1" })
            .mockReturnValueOnce({ id: "p1", content: "External Prompt" });

        const context = new ChatContext("u1", "r1");
        const data = await context.load();

        expect(data.agentPersonalityPrompt).toBe("External Prompt");
    });
});
