export interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

export interface ChatResponse {
    message: string;
    redirect: string | null;
    suggestion?: PendingSuggestion | null;
}

export interface FileChange {
    startLine: number;
    endLine: number;
    column: number;
    originalContent: string;
    suggestedContent: string;
}

export interface PendingSuggestion {
    chatId: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messages: any[];
    filesChanged: Record<string, FileChange>;
}

import { InferSelectModel } from "drizzle-orm";
import { repositories, agentConfigurations, skills, tools, ollamaConfigurations } from "@/../db/schema";

export interface ContextData {
    repo: InferSelectModel<typeof repositories>;
    agentConfig: InferSelectModel<typeof agentConfigurations>;
    personalityPrompt: string | null;
    enabledSkills: InferSelectModel<typeof skills>[];
    enabledTools: InferSelectModel<typeof tools>[];
    ollamaConfig: InferSelectModel<typeof ollamaConfigurations>;
    initialFileContent: string;
    fileContents: Record<string, string>;
}
