import { db } from "@/../db";
import { agentConfigurations, skills, tools, repositories, systemPrompts, ollamaConfigurations, anthropicConfigurations, googleConfigurations } from "@/../db/schema";

import { eq, and, isNull } from "drizzle-orm";
import { getRepoFileContentInternal } from "@/lib/repo-utils";
import { ContextData } from "./types";

export class ChatContext {
    constructor(
        public readonly userId: string,
        public readonly repoId: string | null = null,
        public readonly agentId?: string,
        public filePath: string | null = null,
        public extraFilePaths: string[] = []
    ) { }

    async load(): Promise<ContextData> {
        const [
            ollamaConfig,
            anthropicConfig,
            googleConfig
        ] = await Promise.all([
            db.select().from(ollamaConfigurations).where(eq(ollamaConfigurations.userId, this.userId)).get(),
            db.select().from(anthropicConfigurations).where(eq(anthropicConfigurations.userId, this.userId)).get(),
            db.select().from(googleConfigurations).where(eq(googleConfigurations.userId, this.userId)).get(),
        ]);

        if (!ollamaConfig && !anthropicConfig && !googleConfig) {
            throw new Error("No LLM providers configured. Please configure Ollama, Claude, or Gemini in Settings.");
        }

        let repo = null;
        if (this.repoId && this.repoId !== "default") {
            repo = db.select().from(repositories).where(eq(repositories.id, this.repoId)).get();
        }

        let agentConfig;
        if (this.agentId) {
            agentConfig = db.select().from(agentConfigurations).where(and(eq(agentConfigurations.id, this.agentId), eq(agentConfigurations.userId, this.userId))).get();
        }

        if (!agentConfig) {
            agentConfig = db.select().from(agentConfigurations).where(eq(agentConfigurations.userId, this.userId)).get();
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


        // Load multiple files for context
        const allFilePaths = Array.from(new Set([
            ...(this.filePath ? [this.filePath] : []),
            ...this.extraFilePaths
        ]));

        const fileContents: Record<string, string> = {};
        if (this.repoId && this.repoId !== "default") {
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
        }

        return {
            repo: repo || undefined,
            agentConfig,
            agentPersonalityPrompt,
            enabledSkills,
            enabledTools,
            ollamaConfig: ollamaConfig || undefined,
            anthropicConfig: anthropicConfig || undefined,
            googleConfig: googleConfig || undefined,
            initialFileContent: this.filePath ? (fileContents[this.filePath] || "") : "",


            fileContents
        };
    }
}
