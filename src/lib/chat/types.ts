export interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

export interface ChatResponse {
    message: string;
    redirect?: string | null;
    suggestion?: PendingSuggestion | null;
    plan?: TechnicalPlan | null;
}

export interface ChatClient {
    chat(messages: ChatMessage[]): Promise<string>;
    streamChat(messages: ChatMessage[]): AsyncGenerator<string>;
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
import { repositories, agentConfigurations, skills, tools, ollamaConfigurations, anthropicConfigurations, googleConfigurations } from "@/../db/schema";


export interface ContextData {
    repo?: InferSelectModel<typeof repositories>;
    agentConfig: InferSelectModel<typeof agentConfigurations>;
    agentPersonalityPrompt: string | null;
    enabledSkills: InferSelectModel<typeof skills>[];
    enabledTools: InferSelectModel<typeof tools>[];
    ollamaConfig?: InferSelectModel<typeof ollamaConfigurations>;
    anthropicConfig?: InferSelectModel<typeof anthropicConfigurations>;
    googleConfig?: InferSelectModel<typeof googleConfigurations>;

    initialFileContent: string;
    fileContents: Record<string, string>;
}

