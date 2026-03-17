import { ChatMessage, ChatResponse, WorkMode, Usage } from "./types";
import { PromptBuilder } from "./prompt-builder";
import { getRepoFileContentInternal } from "@/lib/repo-utils";
import { trace, SpanStatusCode } from "@opentelemetry/api";
import { ChatClientFactory } from "./client-factory";
import { executeSkill } from "../skills/execution-engine";
import { Skill } from "@/types/agent";

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

                const maxSteps = workMode === "DOCUMENTATION" ? 3 : 2;
                let finalResponse: ChatResponse = { message: "" };
                const totalUsage: Usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

                for (let step = 0; step < maxSteps; step++) {
                    const systemPrompt = await PromptBuilder.buildSystemPrompt(contextData, currentFilePath, currentFileContent, workMode, sysPrompt);
                    messages[0].content = systemPrompt;

                    const startTime = Date.now();
                    const { content, usage } = await client.chat(messages);
                    const duration = Date.now() - startTime;

                    if (usage) {
                        totalUsage.promptTokens += usage.promptTokens;
                        totalUsage.completionTokens += usage.completionTokens;
                        totalUsage.totalTokens += usage.totalTokens;
                    }

                    await this.recordUsage(agentId, usage, duration);

                    const actionResult = await this.handleAction(content, step, maxSteps, repoId, userId, contextData.enabledSkills);
                    if (actionResult) {
                        messages.push({ role: "assistant", content });
                        messages.push({ role: "user", content: actionResult.observation });
                        if (actionResult.newPath) {
                            currentFilePath = actionResult.newPath;
                            currentFileContent = actionResult.newContent || "";
                        }
                        continue;
                    }

                    finalResponse = {
                        message: content,
                        redirect: currentFilePath,
                        usage: totalUsage
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
                return tracer.startActiveSpan("inference_service.stream", async (span) => {
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

                        const maxSteps = workMode === "DOCUMENTATION" ? 3 : 2;
                        const totalUsage: Usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

                        for (let step = 0; step < maxSteps; step++) {
                            const child_process = tracer.startSpan("inference_service.step");
                            try {
                                const systemPrompt = await PromptBuilder.buildSystemPrompt(contextData, currentFilePath, currentFileContent, workMode, sysPrompt);
                                messages[0].content = systemPrompt;

                                const startTime = Date.now();
                                const isFinalStep = step === maxSteps - 1;

                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const { assistantContent, usage } = await (InferenceService as any).streamStepContent(
                                    controller,
                                    client,
                                    messages,
                                    isFinalStep
                                );

                                if (usage) {
                                    totalUsage.promptTokens += usage.promptTokens;
                                    totalUsage.completionTokens += usage.completionTokens;
                                    totalUsage.totalTokens += usage.totalTokens;
                                }

                                const duration = Date.now() - startTime;
                                await InferenceService.recordUsage(agentId, usage, duration);

                                const actionResult = await InferenceService.handleAction(assistantContent, step, maxSteps, repoId, userId, contextData.enabledSkills);
                                if (actionResult) {
                                    messages.push({ role: "assistant", content: assistantContent });
                                    messages.push({ role: "user", content: actionResult.observation });
                                    if (actionResult.newPath) {
                                        currentFilePath = actionResult.newPath;
                                        currentFileContent = actionResult.newContent || "";
                                    }
                                    continue;
                                }

                                // Final step should not have assistant content re-enqueued as chunk already handled by streamStepContent
                            } catch (err) {
                                console.error("Error in inference loop:", err);
                                span.setStatus({ code: SpanStatusCode.ERROR, message: err instanceof Error ? err.message : "Inference loop error" });
                            } finally {
                                child_process.end();
                            }
                        }
                        controller.close();
                    } catch (e) {
                        span.setStatus({ code: SpanStatusCode.ERROR, message: e instanceof Error ? e.message : "Stream error" });
                        controller.error(e);
                    } finally {
                        span.end();
                    }
                });
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

    private static async handleAction(content: string, step: number, maxSteps: number, repoId: string | null, userId: string, enabledSkills: Skill[]) {
        return tracer.startActiveSpan("inference_service.handleAction", async (span) => {
            try {
                if (step >= maxSteps - 1) return null;

                const jsonMatch = content.match(/\{[\s\S]*\}/);
                let parsed = null;
                if (jsonMatch) {
                    try { parsed = JSON.parse(jsonMatch[0]); } catch { /* ignore */ }
                }

                if (!parsed) return null;

                // 1. Handle Navigation (Redirect)
                if (repoId && parsed.redirect) {
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
                        span.setStatus({ code: SpanStatusCode.ERROR, message: e instanceof Error ? e.message : "Navigation failed" });
                    }
                }

                // 2. Handle Skill Execution
                if (parsed.skill) {
                    const skillId = parsed.skill;
                    const skill = enabledSkills.find(s => s.id === skillId);
                    if (skill) {
                        const args = parsed.args || [];
                        const argsArray = Array.isArray(args) ? args : [String(args)];

                        span.setAttributes({ "skill.id": skillId, "skill.args": JSON.stringify(argsArray) });

                        try {
                            // Fetch repos once – derive IDs and display names from the same result
                            type RepoRow = { id: string; name: string };
                            let repoRows: RepoRow[] = [];

                            if (repoId !== "NONE") {
                                const { db } = await import("@/../db");
                                const { repositories } = await import("@/../db/schema");
                                const { eq, and, inArray } = await import("drizzle-orm");

                                if (repoId) {
                                    repoRows = await db.select({ id: repositories.id, name: repositories.name })
                                        .from(repositories)
                                        .where(inArray(repositories.id, [repoId]))
                                        .all();
                                } else {
                                    // Global context — all enabled repos for this user
                                    repoRows = await db.select({ id: repositories.id, name: repositories.name })
                                        .from(repositories)
                                        .where(and(eq(repositories.userId, userId), eq(repositories.enabled, true)))
                                        .all();
                                }
                            }

                            const actualRepoIds = repoRows.map(r => r.id);
                            const repoContext = repoRows.length === 0
                                ? "No repository context"
                                : (repoId === null ? `All enabled repos: ${repoRows.map(r => r.name).join(", ")}` : repoRows.map(r => r.name).join(", "));

                            const result = await executeSkill(skill, argsArray, {
                                REPO_IDS: JSON.stringify(actualRepoIds),
                                USER_ID: userId
                            });

                            let observation = `Observation: Executed skill "${skillId}" with args: ${argsArray.join(", ")}.\n`;
                            observation += `Searched Repositories: ${repoContext}\n\n`;
                            observation += `Exit Code: ${result.exitCode}\n`;
                            observation += `Command: ${result.command}\n`;
                            if (result.stdout) observation += `Output:\n${result.stdout}\n`;
                            if (result.stderr) observation += `Error Output:\n${result.stderr}\n`;

                            return {
                                observation: observation + `\nIMPORTANT: In your final answer, always cite the repository name(s) (${repoContext}) and the exact file path for each result you reference. Do not omit this information.`
                            };
                        } catch (e) {
                            console.error(`Failed to execute skill ${skillId}:`, e);
                            return {
                                observation: `Observation: Failed to execute skill "${skillId}": ${e instanceof Error ? e.message : String(e)}`
                            };
                        }
                    } else {
                        return {
                            observation: `Observation: Skill "${skillId}" is not available for this agent.`
                        };
                    }
                }

                return null;
            } finally {
                span.end();
            }
        });
    }

    private static async streamStepContent(
        controller: ReadableStreamDefaultController,
        client: { streamChat: (messages: ChatMessage[]) => AsyncIterable<string | { usage: Usage }> },
        messages: ChatMessage[],
        isFinalStep: boolean
    ): Promise<{ assistantContent: string; usage: Usage | undefined }> {
        let assistantContent = "";
        let usage: Usage | undefined;
        const iterator = client.streamChat(messages);

        if (!isFinalStep) {
            controller.enqueue(new TextEncoder().encode("<think>"));
        }

        let isThinking = false;
        for await (const chunk of iterator) {
            if (typeof chunk === 'string') {
                if (isThinking && isFinalStep) {
                    controller.enqueue(new TextEncoder().encode("</think>"));
                    isThinking = false;
                }
                assistantContent += chunk;
                controller.enqueue(new TextEncoder().encode(chunk));
            } else if ('thinking' in chunk) {
                const thought = (chunk as { thinking: string }).thinking;
                assistantContent += thought;
                
                if (isFinalStep) {
                    if (!isThinking) {
                        controller.enqueue(new TextEncoder().encode("<think>"));
                        isThinking = true;
                    }
                    controller.enqueue(new TextEncoder().encode(thought));
                } else {
                    controller.enqueue(new TextEncoder().encode(thought));
                }
            } else if ('usage' in chunk) {
                usage = chunk.usage;
            }
        }

        if (isThinking && isFinalStep) {
            controller.enqueue(new TextEncoder().encode("</think>\n\n"));
        }

        if (!isFinalStep) {
            controller.enqueue(new TextEncoder().encode("</think>\n\n"));
        }

        return { assistantContent, usage };
    }
}
