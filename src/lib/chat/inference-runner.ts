import { ChatMessage, ChatResponse, ContextData } from "./types";
import { OllamaClient } from "./ollama-client";
import { PromptBuilder } from "./prompt-builder";
import { getRepoFileContentInternal } from "@/lib/repo-utils";

export class InferenceRunner {
    constructor(
        private readonly userId: string,
        private readonly repoId: string,
        private readonly contextData: ContextData,
        private readonly ollama: OllamaClient
    ) { }

    async run(prompt: string, initialFilePath: string | null, initialFileContent: string): Promise<ChatResponse> {
        const messages: ChatMessage[] = [
            { role: "system", content: "" }, // Placeholder, will be updated in the loop
            { role: "user", content: prompt }
        ];

        let currentFilePath = initialFilePath;
        let currentFileContent = initialFileContent;
        let currentRedirect = initialFilePath;

        for (let step = 0; step < 3; step++) {
            console.log(`[Chat Inference] Step ${step + 1}/3...`);
            const systemPrompt = PromptBuilder.buildSystemPrompt(this.contextData, currentFilePath, currentFileContent);
            messages[0].content = systemPrompt; // Refresh system prompt with new context if navigated

            const content = await this.ollama.chat(messages);

            const jsonMatch = content.match(/\{[\s\S]*\}/);
            let parsed = null;
            if (jsonMatch) {
                try {
                    parsed = JSON.parse(jsonMatch[0]);
                } catch (e) {
                    console.warn("Found JSON-like content but failed to parse:", e);
                }
            }

            if (parsed) {
                if (parsed.redirect && step < 2) {
                    const newPath = parsed.redirect;
                    if (newPath !== currentFilePath) {
                        console.log(`[Chat Inference] Navigating to: ${newPath}`);
                        try {
                            const newContent = await getRepoFileContentInternal(this.repoId, newPath, this.userId);
                            const cleanedContent = newContent.replace(/^---\s*[\s\S]*?---\s*/, '');

                            messages.push({ role: "assistant", content });
                            messages.push({
                                role: "user",
                                content: `Observation: You are now seeing the FULL content of "${newPath}".\n\nContent:\n${cleanedContent}\n\nPlease provide your final answer based on this new information.`
                            });

                            currentFilePath = newPath;
                            currentFileContent = cleanedContent;
                            currentRedirect = newPath;
                            continue;
                        } catch (e) {
                            console.error(`Failed to navigate to ${newPath}:`, e);
                        }
                    }
                }

                return {
                    message: parsed.message || content,
                    redirect: parsed.redirect || currentRedirect
                };
            }

            return {
                message: content,
                redirect: currentRedirect
            };
        }

        throw new Error("Maximum inference steps reached.");
    }
}
