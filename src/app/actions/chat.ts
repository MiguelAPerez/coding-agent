"use server";

import { db } from "@/../db";
import { agentConfigurations, skills, tools, repositories, systemPrompts } from "@/../db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { getRepoFileContent } from "./files";
import { ollamaConfigurations } from "@/../db/schema";

export async function chatWithDoc(repoId: string, filePath: string | null, prompt: string, agentId?: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const userId = session.user.id;

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

    // Inform the AI about the repository structure if it needs to find a file
    if (!filePath && fileList.length > 0) {
        fullSystemPrompt += "\nAvailable Documentation Files:\n";
        fullSystemPrompt += fileList.map((f: { path: string; title?: string; description?: string }) =>
            `- ${f.path}${f.title ? ` (${f.title})` : ""}${f.description ? `: ${f.description}` : ""}`
        ).join("\n");
        fullSystemPrompt += "\n\nSince no specific file is currently open, use the list above to guide the user or suggest a relevant file to read.";
    }

    if (filePath) {
        fullSystemPrompt += `Current File: ${filePath}\nContent:\n${fileContent}\n`;
    }

    fullSystemPrompt += `
CRITICAL INSTRUCTIONS:
1. Provide helpful answers based on the documentation provided.
2. If you suggest navigating to another file within the same repository, you MUST respond with a JSON object.
3. The JSON object should have two fields: "message" (your explanation) and "redirect" (the relative path to the suggested file).
4. If NO redirect is needed, just respond with plain text.
5. Example JSON response: {"message": "You can find more details in the installation guide.", "redirect": "docs/install.md"}
`;

    // 6. Call Ollama
    const ollamaConfig = db.select().from(ollamaConfigurations).where(eq(ollamaConfigurations.userId, userId)).get();
    if (!ollamaConfig) throw new Error("Ollama not configured in settings.");

    try {
        const response = await fetch(`${ollamaConfig.url}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: agentConfig.model,
                messages: [
                    { role: "system", content: fullSystemPrompt },
                    { role: "user", content: prompt }
                ],
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

        // Try to parse as JSON if it looks like JSON
        if (content.trim().startsWith("{") && content.trim().endsWith("}")) {
            try {
                const parsed = JSON.parse(content);
                if (parsed.message) {
                    return {
                        message: parsed.message,
                        redirect: parsed.redirect || null
                    };
                }
            } catch (e) {
                // Not valid JSON, treat as plain text
                console.warn("Failed to parse AI response as JSON:", e);
            }
        }

        return {
            message: content,
            redirect: null
        };

    } catch (error) {
        console.error("Chat error:", error);
        throw error;
    }
}
