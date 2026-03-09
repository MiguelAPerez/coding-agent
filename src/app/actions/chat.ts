"use server";

import { db } from "@/../db";
import { agentConfigurations, skills, tools, repositories, systemPrompts } from "@/../db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { getRepoFileContent, getRepoFileContentInternal } from "./files";
import { ollamaConfigurations } from "@/../db/schema";

export async function chatWithDoc(repoId: string, filePath: string | null, prompt: string, agentId?: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");
    return chatWithDocInternal(repoId, filePath, prompt, session.user.id, agentId);
}

export async function chatWithDocInternal(repoId: string, filePath: string | null, prompt: string, userId: string, agentId?: string) {

    // 1. Get Agent Config
    let agentConfig;
    if (agentId) {
        agentConfig = db.select().from(agentConfigurations).where(and(eq(agentConfigurations.id, agentId), eq(agentConfigurations.userId, userId))).get();
    } else {
        // Fallback to the first agent if no agentId is provided
        agentConfig = db.select().from(agentConfigurations).where(eq(agentConfigurations.userId, userId)).get();
    }

    if (!agentConfig || !agentConfig.model) {
        throw new Error("Agent not configured. Please set a model in Agent settings.");
    }

    // 2. Resolve System Prompt (Personality)
    let personalityPrompt = agentConfig.systemPrompt;
    if (agentConfig.systemPromptId) {
        const personality = db.select().from(systemPrompts).where(eq(systemPrompts.id, agentConfig.systemPromptId)).get();
        if (personality) {
            personalityPrompt = personality.content;
        }
    }

    // 3. Get Enabled Skills and Tools for this agent
    const enabledSkills = db.select().from(skills).where(and(
        eq(skills.userId, userId),
        eq(skills.isEnabled, true),
        agentId ? eq(skills.agentId, agentId) : isNull(skills.agentId) // Handle legacy or global if any
    )).all();

    const enabledTools = db.select().from(tools).where(and(
        eq(tools.userId, userId),
        eq(tools.isEnabled, true),
        agentId ? eq(tools.agentId, agentId) : isNull(tools.agentId)
    )).all();

    // 4. Get Repo Context
    const repo = db.select().from(repositories).where(eq(repositories.id, repoId)).get();
    if (!repo) throw new Error("Repository not found");

    let fileContent = "";
    if (filePath) {
        try {
            fileContent = await getRepoFileContent(repoId, filePath);
            // Strip frontmatter
            fileContent = fileContent.replace(/^---\s*[\s\S]*?---\s*/, '');
        } catch (e) {
            console.error("Error reading file content for chat:", e);
        }
    }

    // 5. Construct System Prompt
    let fullSystemPrompt = personalityPrompt || "You are a helpful coding assistant.";

    // Parse repository metadata for structure
    const docsMetadata = repo.docsMetadata ? JSON.parse(repo.docsMetadata) : {};
    const fileList = docsMetadata.fileList || [];

    if (enabledSkills.length > 0) {
        fullSystemPrompt += "\n\nAvailable Skills:\n" + enabledSkills.map(s => `- ${s.name}: ${s.description}\n${s.content}`).join("\n\n");
    }

    if (enabledTools.length > 0) {
        fullSystemPrompt += "\n\nAvailable Tools:\n" + enabledTools.map(t => `- ${t.name}: ${t.description}\nSchema: ${t.schema}`).join("\n\n");
    }

    fullSystemPrompt += `\n\nContext:\nRepository: ${repo.fullName}\n`;

    // Inform the AI about the repository structure for discovery
    if (fileList.length > 0) {
        fullSystemPrompt += "\nAvailable Documentation Files:\n";
        fullSystemPrompt += fileList.map((f: { path: string; title?: string; description?: string }) =>
            `- ${f.path}${f.title ? ` (${f.title})` : ""}${f.description ? `: ${f.description}` : ""}`
        ).join("\n");
    }

    if (filePath) {
        fullSystemPrompt += `\nCurrently viewed file: ${filePath}\nContent:\n${fileContent}\n`;
    }

    fullSystemPrompt += `
CRITICAL INSTRUCTIONS:
1. Provide helpful answers based on the documentation provided.
2. If you identify a relevant file in the "Available Documentation Files" list that could help answer the user's question, you MUST navigate to it first using the "redirect" field.
3. DO NOT attempt to answer detailed questions based ONLY on the file titles or descriptions in the list. The descriptions are just summaries; the full details are inside the files.
4. "Read Before You Lead": If you haven't seen the full content of a relevant file yet, navigate to it, read it, and THEN provide your final answer in the subsequent turn.
5. Your FINAL response after gathering enough information should be helpful plain text (Markdown is encouraged). 
6. If you want to point the user to a specific file as your final recommendation, include the "redirect" field in your final JSON response.
7. JSON format for both intermediate navigation and final recommendations: {"message": "Your thoughts or final answer", "redirect": "path/to/file.md"}
8. ALWAYS respond with valid JSON if you use the "redirect" field.
`;

    // 6. Call Ollama with Multi-Step Inference
    const ollamaConfig = db.select().from(ollamaConfigurations).where(eq(ollamaConfigurations.userId, userId)).get();
    if (!ollamaConfig) throw new Error("Ollama not configured in settings.");

    const currentMessages = [
        { role: "system", content: fullSystemPrompt },
        { role: "user", content: prompt }
    ];
    let finalRedirect = filePath;

    try {
        for (let step = 0; step < 3; step++) {
            console.log(`[Chat Inference] Step ${step + 1}/3...`);
            const response = await fetch(`${ollamaConfig.url}/api/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: agentConfig.model,
                    messages: currentMessages,
                    stream: false,
                    options: {
                        temperature: agentConfig.temperature / 100
                    }
                }),
            });

            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.statusText}`);
            }

            const data = await response.json();
            const content = data.message.content;

            // Robust JSON extraction (handles markdown blocks)
            let parsed = null;
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    parsed = JSON.parse(jsonMatch[0]);
                } catch (e) {
                    console.warn("Found JSON-like content but failed to parse:", e);
                }
            }

            if (parsed) {
                if (parsed.redirect && step < 2) { 
                    const newFilePath = parsed.redirect;
                    // Avoid navigating to the same file we already have in context
                    if (newFilePath !== filePath && newFilePath !== finalRedirect) {
                        console.log(`[Chat Inference] Navigating to: ${newFilePath}`);
                        try {
                            const newContent = await getRepoFileContentInternal(repoId, newFilePath, userId);
                            const cleanedContent = newContent.replace(/^---\s*[\s\S]*?---\s*/, '');
                            
                            currentMessages.push({ role: "assistant", content }); 
                            currentMessages.push({ 
                                role: "user", 
                                content: `Observation: You are now seeing the FULL content of "${newFilePath}".\n\nContent:\n${cleanedContent}\n\nPlease provide your final answer based on this new information.` 
                            });
                            
                            finalRedirect = newFilePath;
                            continue; 
                        } catch (e) {
                            console.error(`Failed to navigate to ${newFilePath} internally:`, e);
                        }
                    }
                }
                
                return {
                    message: parsed.message || content,
                    redirect: parsed.redirect || finalRedirect
                };
            }

            // If it's plain text or we reached max steps
            return {
                message: content,
                redirect: finalRedirect
            };
        }

        throw new Error("Maximum inference steps reached without response.");

    } catch (error) {
        console.error("Chat error:", error);
        throw error;
    }
}
