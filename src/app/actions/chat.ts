"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { ChatContext } from "@/lib/chat/context";
import { OllamaClient } from "@/lib/chat/ollama-client";
import { InferenceRunner } from "@/lib/chat/inference-runner";
import { ChatMessage, ChatResponse } from "@/lib/chat/types";
import { extractMentionedPaths, parseDiffs, parseTechnicalPlan } from "@/lib/chat/utils";
import { getPromptFromFile } from "./prompts";

export type { ChatMessage, ChatResponse, FileChange, PendingSuggestion, TechnicalPlan, PlanStep } from "@/lib/chat/types";

// --- Public Actions ---

export async function chatWithDoc(repoId: string, filePath: string | null, prompt: string, agentId?: string): Promise<ChatResponse> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");
    return chatWithDocInternal(repoId, filePath, prompt, session.user.id, agentId);
}

export async function chatWithDocInternal(repoId: string, filePath: string | null, prompt: string, userId: string, agentId?: string): Promise<ChatResponse> {
    const context = new ChatContext(userId, repoId, agentId, filePath);
    const contextData = await context.load();

    const ollama = new OllamaClient(
        contextData.ollamaConfig,
        contextData.agentConfig.model!,
        contextData.agentConfig.temperature
    );

    const runner = new InferenceRunner(userId, repoId, contextData, ollama);

    return runner.run(prompt, filePath, contextData.initialFileContent);
}

export async function chatWithAgent(
    repoId: string,
    filePath: string | null,
    prompt: string,
    agentId: string,
    history: ChatMessage[] = []
): Promise<ChatResponse> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    return chatWithAgentInternal(repoId, filePath, prompt, agentId, session.user.id, history);
}

export async function chatWithAgentInternal(
    repoId: string,
    filePath: string | null,
    prompt: string,
    agentId: string,
    userId: string,
    history: ChatMessage[] = []
): Promise<ChatResponse> {
    const extraPaths = extractMentionedPaths(prompt + " " + history.map(m => m.content).join(" "));

    const context = new ChatContext(userId, repoId, agentId, filePath, extraPaths);
    const contextData = await context.load();

    const ollama = new OllamaClient(
        contextData.ollamaConfig,
        contextData.agentConfig.model!,
        contextData.agentConfig.temperature
    );

    // Build the system prompt with the "Diff Generator" instructions
    let systemPrompt = await getPromptFromFile("CODER");

    if (contextData.agentPersonalityPrompt) {
        systemPrompt = `${contextData.agentPersonalityPrompt}\n\n${systemPrompt}`;
    }

    // Add existing skills
    if (contextData.enabledSkills.length > 0) {
        systemPrompt += "\n\nAvailable Skills:\n" + contextData.enabledSkills.map((s) => `- ${s.name}: ${s.description}\n${s.content}`).join("\n\n");
    }

    const messages: ChatMessage[] = [
        { role: "system", content: systemPrompt },
        ...history,
    ];

    if (Object.keys(contextData.fileContents).length > 0) {
        let contextMessage = "Here is the content of the files currently relevant to the conversation:\n\n";
        for (const [path, content] of Object.entries(contextData.fileContents)) {
            contextMessage += `FILE: ${path}\n\`\`\`\n${content}\n\`\`\`\n\n`;
        }
        contextMessage += `User Request: ${prompt}`;
        messages.push({ role: "user", content: contextMessage });
    } else {
        messages.push({ role: "user", content: prompt });
    }

    const responseContent = await ollama.chat(messages);

    // Parse diffs and clean content
    const { suggestion, cleanContent } = parseDiffs(responseContent, filePath, contextData.fileContents);

    return {
        message: cleanContent,
        redirect: null,
        suggestion: Object.keys(suggestion.filesChanged).length > 0 ? suggestion : null
    };
}

export async function getTechnicalPlan(
    repoId: string,
    filePath: string | null,
    prompt: string,
    agentId: string,
    history: ChatMessage[] = []
): Promise<ChatResponse> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const extraPaths = extractMentionedPaths(prompt + " " + history.map(m => m.content).join(" "));
    const context = new ChatContext(session.user.id, repoId, agentId, filePath, extraPaths);
    const contextData = await context.load();

    const ollama = new OllamaClient(
        contextData.ollamaConfig,
        contextData.agentConfig.model!,
        contextData.agentConfig.temperature
    );

    // Build the system prompt with the "Planner" instructions
    let systemPrompt = await getPromptFromFile("PLANNER");
    if (contextData.agentPersonalityPrompt) {
        systemPrompt = `${contextData.agentPersonalityPrompt}\n\n${systemPrompt}`;
    }

    const messages: ChatMessage[] = [
        { role: "system", content: systemPrompt },
        ...history,
    ];

    if (Object.keys(contextData.fileContents).length > 0) {
        let contextMessage = "Here is the content of the files currently relevant to the conversation:\n\n";
        for (const [path, content] of Object.entries(contextData.fileContents)) {
            contextMessage += `FILE: ${path}\n\`\`\`\n${content}\n\`\`\`\n\n`;
        }
        contextMessage += `User Request: ${prompt}`;
        messages.push({ role: "user", content: contextMessage });
    } else {
        messages.push({ role: "user", content: prompt });
    }

    const responseContent = await ollama.chat(messages);
    const plan = parseTechnicalPlan(responseContent);

    // Clean up the message content by removing the JSON block
    const cleanMessage = responseContent.replace(/```json\n[\s\S]*?\n```/g, "").trim();

    return {
        message: cleanMessage,
        redirect: null,
        plan
    };
}
