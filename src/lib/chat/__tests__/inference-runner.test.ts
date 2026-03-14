import { InferenceRunner } from "../inference-runner";
import { ChatClient, ContextData } from "../types";
import { PromptBuilder } from "../prompt-builder";
import { getRepoFileContentInternal } from "@/lib/repo-utils";

// Mock dependencies
jest.mock("../prompt-builder");
jest.mock("@/lib/repo-utils");

describe("InferenceRunner", () => {
    const userId = "user-123";
    const repoId = "repo-456";
    const contextData: ContextData = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        agentConfig: {} as any, // suppressed for mock
        agentPersonalityPrompt: "You are a helpful assistant.",
        enabledSkills: [],
        enabledTools: [],
        initialFileContent: "",
        fileContents: {},
    };
    
    // Partially mock ChatClient to satisfy both methods
    const mockChatClient: ChatClient = {
        chat: jest.fn(),
        streamChat: jest.fn(),
    };

    let runner: InferenceRunner;

    beforeEach(() => {
        runner = new InferenceRunner(userId, repoId, contextData, mockChatClient);
        jest.clearAllMocks();
        (PromptBuilder.buildSystemPrompt as jest.Mock).mockResolvedValue("Mock System Prompt");
    });

    it("should return a simple message when no redirect is requested", async () => {
        const mockResponse = JSON.stringify({ message: "Hello there!" });
        (mockChatClient.chat as jest.Mock).mockResolvedValue(mockResponse);

        const result = await runner.run("hi", "file.ts", "content", "sys-prompt");

        expect(result.message).toBe("Hello there!");
        expect(result.redirect).toBe("file.ts");
        expect(mockChatClient.chat).toHaveBeenCalledTimes(1);
    });

    it("should handle navigation/redirect and perform a second step", async () => {
        // Step 1: Redirect to another file
        (mockChatClient.chat as jest.Mock)
            .mockResolvedValueOnce(JSON.stringify({ redirect: "other.ts", message: "Navigating..." }))
            // Step 2: Final answer
            .mockResolvedValueOnce(JSON.stringify({ message: "Found it in other.ts" }));

        (getRepoFileContentInternal as jest.Mock).mockResolvedValue("---header---\nOther File Content");

        const result = await runner.run("search for something", "file.ts", "content", "sys-prompt");

        expect(result.message).toBe("Found it in other.ts");
        expect(result.redirect).toBe("other.ts");
        expect(getRepoFileContentInternal).toHaveBeenCalledWith(repoId, "other.ts", userId);
        expect(mockChatClient.chat).toHaveBeenCalledTimes(2);
    });

    it("should fallback to raw content if JSON parsing fails", async () => {
        const rawContent = "This is not JSON but a direct answer.";
        (mockChatClient.chat as jest.Mock).mockResolvedValue(rawContent);

        const result = await runner.run("tell me something", "file.ts", "content", "sys-prompt");

        expect(result.message).toBe(rawContent);
        expect(result.redirect).toBe("file.ts");
    });

    it("should stop after 2 steps and return current progress", async () => {
        // Step 1: Redirect
        (mockChatClient.chat as jest.Mock)
            .mockResolvedValueOnce(JSON.stringify({ redirect: "file2.ts" }))
            // Step 2: Another redirect (it should stop here because step becomes 1 and loop ends or continue check fails)
            .mockResolvedValueOnce(JSON.stringify({ redirect: "file3.ts", message: "Still searching" }));

        (getRepoFileContentInternal as jest.Mock).mockResolvedValue("Content 2");

        const result = await runner.run("deep search", "file1.ts", "content 1", "sys-prompt");

        // The current implementation returns the parsed object on step 2
        // currentRedirect should be file2.ts from the first successful navigation
        expect(result.redirect).toBe("file2.ts");
        expect(result.message).toBe("Still searching");
        expect(mockChatClient.chat).toHaveBeenCalledTimes(2);
    });

    it("should handle navigation failure and return current state", async () => {
        (mockChatClient.chat as jest.Mock).mockResolvedValue(JSON.stringify({ redirect: "nonexistent.ts" }));
        (getRepoFileContentInternal as jest.Mock).mockRejectedValue(new Error("File not found"));

        const result = await runner.run("go to void", "file.ts", "content", "sys-prompt");

        // It should catch the error and return the current status
        expect(result.redirect).toBe("file.ts");
    });
});
