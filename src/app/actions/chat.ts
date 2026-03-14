"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { ChatContext } from "@/lib/chat/context";
import { ChatClientFactory } from "@/lib/chat/client-factory";
import { InferenceRunner } from "@/lib/chat/inference-runner";
import { ChatMessage, ChatResponse } from "@/lib/chat/types";
import { extractMentionedPaths, parseDiffs, parseTechnicalPlan } from "@/lib/chat/utils";
import { PromptBuilder } from "@/lib/chat/prompt-builder";
import { getPromptFromFile } from "./prompts";

export type { ChatMessage, ChatResponse, FileChange, PendingSuggestion, TechnicalPlan, PlanStep } from "@/lib/chat/types";

// --- Public Actions ---


/**
 * Chat with the agent. 
 * 
 * A generic entry point, will not use any specific mode just use the agent personality prompt.
 */
export async function chatWithAgent(
    agentId: string,
    prompt: string,
    history: ChatMessage[] = [],
    instructions: string | null = null,
    repoId: string | null = null,
    filePath: string | null = null,
): Promise<ChatResponse> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");
    return chatWithAgentInternal(agentId, prompt, session.user.id, history, instructions, repoId, filePath);
}

export async function chatWithAgentInternal(
    agentId: string,
    prompt: string,
    userId: string,
    history: ChatMessage[] = [],
    instructions: string | null = null,
    repoId: string | null = null,
    filePath: string | null = null,
    discordChannelId: string | null = null, // @todo - will extract for something more generic
): Promise<ChatResponse> {

    if (!prompt) throw new Error("Empty prompt");

    const extraPaths = extractMentionedPaths(prompt + " " + history.map(m => m.content).join(" "));

    const start = Date.now();
    const context = new ChatContext(userId, repoId, agentId, filePath, extraPaths);
    const contextData = await context.load();
    const contextLoadTime = Date.now() - start;

    const client = ChatClientFactory.getClient(contextData);

    const messages: ChatMessage[] = [
        { role: "system", content: "" }, // Placeholder
        ...history,
    ];

    // Avoid duplication if history already contains the current prompt
    const lastUserMessage = [...history].reverse().find(m => m.role === "user");
    const isDuplicate = lastUserMessage && lastUserMessage.content.trim() === prompt.trim();
    
    if (isDuplicate) {
        console.log(`[DEDUPE] Skipping redundant prompt. (Content matches last user message)`);
    } else {
        messages.push({ role: "user", content: prompt });
    }

    // Simple Channel Response
    const promptStart = Date.now();
    instructions = (discordChannelId) ? await getPromptFromFile("DISCORD") : null;
    const systemPrompt = await PromptBuilder.buildSystemPrompt(contextData, null, contextData.initialFileContent || "", instructions);
    messages[0].content = systemPrompt;
    const promptBuildTime = Date.now() - promptStart;

    const inferenceStart = Date.now();
    const responseContent = await client.chat(messages);
    const inferenceTime = Date.now() - inferenceStart;

    console.log(`[chatWithAgentInternal] userId: ${userId} context: ${contextLoadTime}ms, prompt: ${promptBuildTime}ms, inference: ${inferenceTime}ms, total: ${Date.now() - start}ms`);

    // We don't expect an specific format here, just a message
    return {
        message: responseContent || "",
    };
}


/**
 * Chat with the agent in documentation mode.
 */
export async function chatWithDoc(repoId: string, filePath: string | null, prompt: string, agentId?: string): Promise<ChatResponse> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");
    return chatWithDocInternal(repoId, filePath, prompt, session.user.id, agentId);
}

export async function chatWithDocInternal(repoId: string, filePath: string | null, prompt: string, userId: string, agentId?: string): Promise<ChatResponse> {
    const docPrompt = await getPromptFromFile("DOCUMENTATION");
    const context = new ChatContext(userId, repoId, agentId, filePath);
    const contextData = await context.load();

    const client = ChatClientFactory.getClient(contextData);
    // TODO: move json parser into a global place like parseDiff
    const runner = new InferenceRunner(userId, repoId, contextData, client);

    return runner.run(prompt, filePath, contextData.initialFileContent, docPrompt);
}


export async function chatWithCoder(repoId: string, filePath: string | null, prompt: string, agentId: string, history: ChatMessage[] = []): Promise<ChatResponse> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");
    return chatWithCoderInternal(repoId, filePath, prompt, agentId, session.user.id, history);
}

export async function chatWithCoderInternal(
    repoId: string,
    filePath: string | null,
    prompt: string,
    agentId: string,
    userId: string,
    history: ChatMessage[] = [],
): Promise<ChatResponse> {
    const extraPaths = extractMentionedPaths(prompt + " " + history.map(m => m.content).join(" "));

    const context = new ChatContext(userId, repoId, agentId, filePath, extraPaths);
    const contextData = await context.load();

    const client = ChatClientFactory.getClient(contextData);

    // Build the system prompt
    const instructions = await getPromptFromFile("CODER");

    const messages: ChatMessage[] = [
        { role: "system", content: "" }, // Placeholder
        ...history,
    ];

    const systemPrompt = await PromptBuilder.buildSystemPrompt(contextData, filePath, contextData.initialFileContent || "", instructions);
    messages[0].content = systemPrompt;

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

    const responseContent = await client.chat(messages);

    // Parse diffs and clean content
    const { suggestion, cleanContent } = parseDiffs(responseContent, filePath, contextData.fileContents);

    return {
        message: cleanContent,
        redirect: null,
        suggestion: Object.keys(suggestion.filesChanged).length > 0 ? suggestion : null
    };
}

/**
 * Get technical plan for a given prompt.
 */
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

    const client = ChatClientFactory.getClient(contextData);

    // Build the system prompt with the "Planner" instructions
    const plannerInstructions = await getPromptFromFile("PLANNER");

    const messages: ChatMessage[] = [
        { role: "system", content: "" }, // Placeholder
        ...history,
    ];

    const systemPrompt = await PromptBuilder.buildSystemPrompt(contextData, filePath, contextData.initialFileContent || "", plannerInstructions);
    messages[0].content = systemPrompt;

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

    const responseContent = await client.chat(messages);
    const plan = parseTechnicalPlan(responseContent);

    // Clean up the message content by removing the JSON block
    const cleanMessage = responseContent.replace(/```json\n[\s\S]*?\n```/g, "").trim();

    return {
        message: cleanMessage,
        redirect: null,
        plan
    };
}
