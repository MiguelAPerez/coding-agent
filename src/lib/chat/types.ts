export type WorkMode = 'CODER' | 'DOCUMENTATION' | 'REVIEWER' | 'PLANNER' | 'DISCORD' | 'GENERAL';

export interface ChatMessage {
    id?: string;
    role: "system" | "user" | "assistant";
    content: string;
    thinking?: string;
}

export interface ChatResponse {
    message: string;
    redirect?: string | null;
    suggestion?: PendingSuggestion | null;
    plan?: TechnicalPlan | null;
    usage?: Usage;
}

export interface Usage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}

export interface ChatClient {
    chat(messages: ChatMessage[]): Promise<{ content: string; thinking?: string; usage?: Usage }>;
    streamChat(messages: ChatMessage[]): AsyncGenerator<string | { thinking: string } | { usage: Usage }>;
}


export interface PlanStep {
    file: string;
    action: "modify" | "new" | "delete";
    rationale: string;
    status: "pending" | "in-progress" | "completed" | "failed";
}

export interface TechnicalPlan {
    steps: PlanStep[];
}

export interface FileChange {
    startLine: number;
    endLine: number;
    column: number;
    originalContent: string;
    suggestedContent: string;
    preSuggestionContent?: string; // Content of the file/tab right before the suggestion was applied
}

export interface PendingSuggestion {
    chatId: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messages: any[];
    filesChanged: Record<string, FileChange>;
}

import { InferSelectModel } from "drizzle-orm";
import { repositories, agentConfigurations, tools, ollamaConfigurations, anthropicConfigurations, googleConfigurations } from "@/../db/schema";

import { Skill } from "@/types/agent";
export type { Skill };

export interface ContextData {
    repo?: InferSelectModel<typeof repositories>;
    agentConfig: InferSelectModel<typeof agentConfigurations>;
    agentPersonalityPrompt: string | null;
    enabledSkills: Skill[];
    enabledTools: InferSelectModel<typeof tools>[];
    ollamaConfig?: InferSelectModel<typeof ollamaConfigurations>;
    anthropicConfig?: InferSelectModel<typeof anthropicConfigurations>;
    googleConfig?: InferSelectModel<typeof googleConfigurations>;

    initialFileContent: string;
    fileContents: Record<string, string>;
    agentIdentity?: string | null;
    agentWorkflow?: string | null;
    agentPersonality?: string | null;
}

