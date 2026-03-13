import { PromptBuilder } from "../prompt-builder";
import { ContextData } from "../types";

describe("PromptBuilder", () => {
    const mockRepo = {
        fullName: "test/repo",
        docsMetadata: JSON.stringify({
            fileList: [
                { path: "doc1.md", title: "Doc 1", description: "Desc 1" },
                { path: "doc2.md" }
            ]
        })
    };

    const mockContext: ContextData = {
        repo: mockRepo as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        personalityPrompt: "You are a specialized bot.",
        enabledSkills: [
            { 
                name: "Skill1", 
                description: "Desc1", 
                content: "Content1", 
                id: "s1",
                userId: "u1",
                agentId: null,
                updatedAt: new Date(),
                isEnabled: true
            }
        ],
        enabledTools: [
            { 
                name: "Tool1", 
                description: "TDesc1", 
                schema: "{}", 
                id: "t1",
                userId: "u1",
                agentId: null,
                updatedAt: new Date(),
                isEnabled: true
            }
        ],
        agentConfig: {} as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        ollamaConfig: {} as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        initialFileContent: "",
        fileContents: {}
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    it("should build a complete system prompt", () => {
        const prompt = PromptBuilder.buildSystemPrompt(mockContext, "src/file.ts", "console.log('test')");
        
        expect(prompt).toContain("You are a specialized bot.");
        expect(prompt).toContain("Available Skills:\n- Skill1: Desc1\nContent1");
        expect(prompt).toContain("Available Tools:\n- Tool1: TDesc1\nSchema: {}");
        expect(prompt).toContain("Repository: test/repo");
        expect(prompt).toContain("- doc1.md (Doc 1): Desc 1");
        expect(prompt).toContain("- doc2.md");
        expect(prompt).toContain("Currently viewed file: src/file.ts");
        expect(prompt).toContain("console.log('test')");
        expect(prompt).toContain("CRITICAL INSTRUCTIONS:");
    });

    it("should use default personality if none provided", () => {
        const context = { ...mockContext, personalityPrompt: "" };
        const prompt = PromptBuilder.buildSystemPrompt(context, null, "");
        expect(prompt).toContain("You are a helpful coding assistant.");
    });

    it("should handle empty skills and tools", () => {
        const context = { ...mockContext, enabledSkills: [], enabledTools: [] };
        const prompt = PromptBuilder.buildSystemPrompt(context, null, "");
        expect(prompt).not.toContain("Available Skills:");
        expect(prompt).not.toContain("Available Tools:");
    });

    it("should handle missing docs metadata", () => {
        const context = { 
            ...mockContext, 
            repo: { fullName: "test/empty", docsMetadata: null } as any // eslint-disable-line @typescript-eslint/no-explicit-any
        };
        const prompt = PromptBuilder.buildSystemPrompt(context, null, "");
        expect(prompt).toContain("Repository: test/empty");
        expect(prompt).not.toContain("Available Documentation Files:");
    });

    it("should handle current file path being null", () => {
        const prompt = PromptBuilder.buildSystemPrompt(mockContext, null, "");
        expect(prompt).not.toContain("Currently viewed file:");
    });
});
