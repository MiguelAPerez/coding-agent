import { db } from "@/../db";
import { agentConfigurations, skills, tools, repositories, systemPrompts, ollamaConfigurations, anthropicConfigurations } from "@/../db/schema";

import { eq, and, isNull } from "drizzle-orm";
import { getRepoFileContentInternal } from "@/lib/repo-utils";
import { ContextData } from "./types";

export class ChatContext {
    constructor(
        public readonly userId: string,
        public readonly repoId: string,
        public readonly agentId?: string,
        public filePath: string | null = null,
        public extraFilePaths: string[] = []
    ) { }

    async load(): Promise<ContextData> {
        const repo = db.select().from(repositories).where(eq(repositories.id, this.repoId)).get();
        if (!repo) throw new Error("Repository not found");

        let agentConfig;
        if (this.agentId) {
            agentConfig = db.select().from(agentConfigurations).where(and(eq(agentConfigurations.id, this.agentId), eq(agentConfigurations.userId, this.userId))).get();
            if (!agentConfig) {
                console.warn(`Requested agent ${this.agentId} not found for user ${this.userId}. Falling back to default.`);
                agentConfig = db.select().from(agentConfigurations).where(and(eq(agentConfigurations.userId, this.userId), isNull(agentConfigurations.isManaged))).get() 
                    || db.select().from(agentConfigurations).where(eq(agentConfigurations.userId, this.userId)).get();
            }
        } else {
            // Get the first agent that has a model configured
            agentConfig = db.select().from(agentConfigurations).where(and(eq(agentConfigurations.userId, this.userId))).get();
        }

        if (!agentConfig) {
            throw new Error("No AI agents are configured. Please create an agent in the Agent Settings page first.");
        }

        if (!agentConfig.model) {
            throw new Error(`The selected agent "${agentConfig.name}" has no model configured. Please update it in the Agent Settings page.`);
        }

        let agentPersonalityPrompt = agentConfig.systemPrompt;
        if (agentConfig.systemPromptId) {
            const personality = db.select().from(systemPrompts).where(eq(systemPrompts.id, agentConfig.systemPromptId)).get();
            if (personality) agentPersonalityPrompt = personality.content;
        }

        const enabledSkills = db.select().from(skills).where(and(
            eq(skills.userId, this.userId),
            eq(skills.isEnabled, true),
            this.agentId ? eq(skills.agentId, this.agentId) : isNull(skills.agentId)
        )).all();

        const enabledTools = db.select().from(tools).where(and(
            eq(tools.userId, this.userId),
            eq(tools.isEnabled, true),
            this.agentId ? eq(tools.agentId, this.agentId) : isNull(tools.agentId)
        )).all();

        const ollamaConfig = db.select().from(ollamaConfigurations).where(eq(ollamaConfigurations.userId, this.userId)).get();
        const anthropicConfig = db.select().from(anthropicConfigurations).where(eq(anthropicConfigurations.userId, this.userId)).get();
        
        if (!ollamaConfig && !anthropicConfig) throw new Error("No LLM providers configured. Please configure Ollama or Claude in Settings.");


        // Load multiple files for context
        const allFilePaths = Array.from(new Set([
            ...(this.filePath ? [this.filePath] : []),
            ...this.extraFilePaths
        ]));

        const fileContents: Record<string, string> = {};
        for (const path of allFilePaths) {
            try {
                let content = await getRepoFileContentInternal(this.repoId, path, this.userId);
                // Remove frontmatter if present
                content = content.replace(/^---\s*[\s\S]*?---\s*/, '');
                fileContents[path] = content;
            } catch (e) {
                console.error(`Error reading context file ${path}:`, e);
            }
        }

        return {
            repo,
            agentConfig,
            agentPersonalityPrompt,
            enabledSkills,
            enabledTools,
            ollamaConfig: ollamaConfig!, // Note: We might need to handle the case where one is missing better if both are optional, but for now we expect at least one.
            anthropicConfig,
            initialFileContent: this.filePath ? (fileContents[this.filePath] || "") : "",

            fileContents
        };
    }
}
