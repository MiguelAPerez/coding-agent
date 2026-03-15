import { ChatMessage, ChatResponse, WorkMode, Usage } from "./types";
import { PromptBuilder } from "./prompt-builder";
import { getRepoFileContentInternal } from "@/lib/repo-utils";
import { trace, SpanStatusCode } from "@opentelemetry/api";
import { ChatClientFactory } from "./client-factory";

const tracer = trace.getTracer("inference-service");

export class InferenceService {
    /**
     * Runs a multi-step inference loop (non-streaming).
     */
    static async runInference(
        userId: string,
        repoId: string | null,
        agentId: string,
        prompt: string,
        workMode: WorkMode,
        history: ChatMessage[] = [],
        filePath: string | null = null,
        sysPrompt: string | null = null
    ): Promise<ChatResponse> {
        return tracer.startActiveSpan("inference_service.run", async (span) => {
            try {
                const { contextData, client } = await this.prepareContext(userId, repoId, agentId, filePath, prompt, history);
                
                let currentFilePath = filePath;
                let currentFileContent = contextData.initialFileContent || "";
                
                const lastHistoryMessage = history[history.length - 1];
                const messages: ChatMessage[] = [
                    { role: "system", content: "" },
                    ...history,
                ];

                if (!lastHistoryMessage || lastHistoryMessage.content !== prompt || lastHistoryMessage.role !== "user") {
                    messages.push({ role: "user", content: prompt });
                }

                const maxSteps = workMode === "DOCUMENTATION" ? 2 : 1;
                let finalResponse: ChatResponse = { message: "" };

                for (let step = 0; step < maxSteps; step++) {
                    const systemPrompt = await PromptBuilder.buildSystemPrompt(contextData, currentFilePath, currentFileContent, workMode, sysPrompt);
                    messages[0].content = systemPrompt;

                    const startTime = Date.now();
                    const { content, usage } = await client.chat(messages);
                    const duration = Date.now() - startTime;

                    await this.recordUsage(agentId, usage, duration);

                    const navigation = await this.handleNavigation(content, step, maxSteps, repoId, userId);
                    if (navigation) {
                        messages.push({ role: "assistant", content });
                        messages.push({ role: "user", content: navigation.observation });
                        currentFilePath = navigation.newPath;
                        currentFileContent = navigation.newContent;
                        continue;
                    }

                    finalResponse = { 
                        message: content,
                        redirect: currentFilePath,
                        usage: usage
                    };
                    break;
                }

                return finalResponse;
            } catch (error) {
                span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : "Unknown error" });
                throw error;
            } finally {
                span.end();
            }
        });
    }

    /**
     * Runs a multi-step inference loop with streaming for the final response.
     */
    static async streamInference(
        userId: string,
        repoId: string | null,
        agentId: string,
        prompt: string,
        workMode: WorkMode,
        history: ChatMessage[] = [],
        filePath: string | null = null,
        sysPrompt: string | null = null
    ): Promise<ReadableStream> {
        return new ReadableStream({
            async start(controller) {
                try {
                    const { contextData, client } = await InferenceService.prepareContext(userId, repoId, agentId, filePath, prompt, history);
                    
                    let currentFilePath = filePath;
                    let currentFileContent = contextData.initialFileContent || "";
                    
                    const lastHistoryMessage = history[history.length - 1];
                    const messages: ChatMessage[] = [
                        { role: "system", content: "" },
                        ...(history || []),
                    ];

                    if (!lastHistoryMessage || lastHistoryMessage.content !== prompt || lastHistoryMessage.role !== "user") {
                        messages.push({ role: "user", content: prompt });
                    }

                    const maxSteps = workMode === "DOCUMENTATION" ? 2 : 1;

                    for (let step = 0; step < maxSteps; step++) {
                        const systemPrompt = await PromptBuilder.buildSystemPrompt(contextData, currentFilePath, currentFileContent, workMode, sysPrompt);
                        messages[0].content = systemPrompt;

                        let assistantContent = "";
                        let usage: Usage | undefined;
                        const startTime = Date.now();

                        const isFinalStep = step === maxSteps - 1;
                        const iterator = client.streamChat(messages);

                        for await (const chunk of iterator) {
                            if (typeof chunk === 'string') {
                                assistantContent += chunk;
                                // Only stream to controller if it's the final potential step or if no navigation is expected
                                if (isFinalStep) {
                                    controller.enqueue(new TextEncoder().encode(chunk));
                                }
                            } else if (chunk.usage) {
                                usage = chunk.usage;
                            }
                        }

                        const duration = Date.now() - startTime;
                        await InferenceService.recordUsage(agentId, usage, duration);

                        const navigation = await InferenceService.handleNavigation(assistantContent, step, maxSteps, repoId, userId);
                        if (navigation) {
                            messages.push({ role: "assistant", content: assistantContent });
                            messages.push({ role: "user", content: navigation.observation });
                            currentFilePath = navigation.newPath;
                            currentFileContent = navigation.newContent;
                            continue;
                        }

                        // If it wasn't the final step but we didn't navigate, we should stream what we have if we haven't already
                        if (!isFinalStep) {
                            controller.enqueue(new TextEncoder().encode(assistantContent));
                        }
                    }
                    controller.close();
                } catch (e) {
                    controller.error(e);
                }
            }
        });
    }

    private static async prepareContext(userId: string, repoId: string | null, agentId: string, filePath: string | null, prompt: string, history: ChatMessage[]) {
        const { ChatContext } = await import("./context");
        const { extractMentionedPaths } = await import("./utils");
        
        const extraPaths = extractMentionedPaths(prompt + " " + (history || []).map(m => m.content).join(" "));
        const context = new ChatContext(userId, repoId, agentId, filePath, extraPaths);
        const contextData = await context.load();
        const client = ChatClientFactory.getClient(contextData);
        
        return { contextData, client };
    }

    private static async recordUsage(agentId: string, usage: Usage | undefined, duration: number) {
        if (agentId) {
            try {
                const { recordAgentUsage } = await import("@/app/actions/performance");
                await recordAgentUsage(agentId, usage?.promptTokens || 0, usage?.completionTokens || 0, duration);
            } catch (e) {
                console.error("Failed to record agent usage:", e);
            }
        }
    }

    private static async handleNavigation(content: string, step: number, maxSteps: number, repoId: string | null, userId: string) {
        if (repoId && step < maxSteps - 1) {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            let parsed = null;
            if (jsonMatch) {
                try { parsed = JSON.parse(jsonMatch[0]); } catch { /* ignore */ }
            }

            if (parsed && parsed.redirect) {
                const newPath = parsed.redirect;
                try {
                    const newContent = await getRepoFileContentInternal(repoId, newPath, userId);
                    const cleanedContent = newContent.replace(/^---\s*[\s\S]*?---\s*/, '');
                    
                    return {
                        newPath,
                        newContent: cleanedContent,
                        observation: `Observation: You are now seeing the FULL content of "${newPath}".\n\nContent:\n${cleanedContent}\n\nPlease provide your final answer based on this new information.`
                    };
                } catch (e) {
                    console.error(`Failed to navigate to ${newPath}:`, e);
                }
            }
        }
        return null;
    }
}
