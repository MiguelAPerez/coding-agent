import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { ChatContext } from "@/lib/chat/context";
import { ChatClientFactory } from "@/lib/chat/client-factory";
import { PromptBuilder } from "@/lib/chat/prompt-builder";
import { extractMentionedPaths } from "@/lib/chat/utils";


/**
 * General Chat API Route
 * 
 * This route is used to handle general chat requests.
 */
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { repoId, filePath, prompt, sysPrompt, agentId, history, workMode = "GENERAL" } = await req.json();
        const userId = session.user.id;

        if (!prompt || !agentId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const extraPaths = extractMentionedPaths(prompt + " " + (history || []).map((m: { content: string }) => m.content).join(" "));
        const context = new ChatContext(userId, repoId, agentId, filePath, extraPaths);
        const contextData = await context.load();
        const chatClient = ChatClientFactory.getClient(contextData);

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    let currentFilePath = filePath;
                    let currentFileContent = contextData.initialFileContent || "";
                    const messages = [
                        { role: "system", content: "" }, // Placeholder
                        ...(history || []),
                        { role: "user", content: prompt }
                    ];

                    // For DOCUMENTATION mode, we allow 2 steps of inference (navigation)
                    // For other modes, we just do 1 step (direct response)
                    const maxSteps = workMode === "DOCUMENTATION" ? 2 : 1;

                    for (let step = 0; step < maxSteps; step++) {
                        const systemPrompt = await PromptBuilder.buildSystemPrompt(contextData, currentFilePath, currentFileContent, workMode, sysPrompt);
                        messages[0].content = systemPrompt;

                        let assistantContent = "";
                        let usage: { promptTokens: number; completionTokens: number } | undefined;
                        const startTime = Date.now();
                        
                        const iterator = chatClient.streamChat(messages);
                        for await (const chunk of iterator) {
                            if (typeof chunk === 'string') {
                                assistantContent += chunk;
                                if (maxSteps === 1 || step === maxSteps - 1) {
                                    // Only stream the final response to the client
                                    controller.enqueue(new TextEncoder().encode(chunk));
                                }
                            } else if (chunk.usage) {
                                usage = chunk.usage;
                            }
                        }

                        const duration = Date.now() - startTime;

                        // Record usage stats
                        if (agentId) {
                            try {
                                const { recordAgentUsage } = await import("@/app/actions/performance");
                                await recordAgentUsage(agentId, usage?.promptTokens || 0, usage?.completionTokens || 0, duration);
                            } catch (e) {
                                console.error("Failed to record agent usage:", e);
                            }
                        }

                        if (workMode === "DOCUMENTATION" && repoId && maxSteps > 1 && step < maxSteps - 1) {
                            // Check for navigation in DOCUMENTATION mode
                            const jsonMatch = assistantContent.match(/\{[\s\S]*\}/);
                            let parsed = null;
                            if (jsonMatch) {
                                try { parsed = JSON.parse(jsonMatch[0]); } catch { /* ignore */ }
                            }

                            if (parsed && parsed.redirect && parsed.redirect !== currentFilePath) {
                                const newPath = parsed.redirect;
                                try {
                                    const { getRepoFileContentInternal } = await import("@/lib/repo-utils");
                                    const newContent = await getRepoFileContentInternal(repoId, newPath, userId);
                                    const cleanedContent = newContent.replace(/^---\s*[\s\S]*?---\s*/, '');

                                    messages.push({ role: "assistant", content: assistantContent });
                                    messages.push({
                                        role: "user",
                                        content: `Observation: You are now seeing the FULL content of "${newPath}".\n\nContent:\n${cleanedContent}\n\nPlease provide your final answer based on this new information.`
                                    });

                                    currentFilePath = newPath;
                                    currentFileContent = cleanedContent;
                                    continue; // Go to next step
                                } catch (e) {
                                    console.error(`Failed to navigate to ${newPath}:`, e);
                                }
                            }
                        }
                    }
                    controller.close();
                } catch (e) {
                    controller.error(e);
                }
            },
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Transfer-Encoding": "chunked",
            },
        });
    } catch (error) {
        console.error("API Chat Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
