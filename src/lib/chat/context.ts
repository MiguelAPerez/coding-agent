import { db } from "@/../db";
import { agentConfigurations, skills, tools, repositories, systemPrompts, ollamaConfigurations } from "@/../db/schema";
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
        } else {
            agentConfig = db.select().from(agentConfigurations).where(eq(agentConfigurations.userId, this.userId)).get();
        }
        if (!agentConfig || !agentConfig.model) throw new Error("Agent not configured.");

        let personalityPrompt = agentConfig.systemPrompt;
        if (agentConfig.systemPromptId) {
            const personality = db.select().from(systemPrompts).where(eq(systemPrompts.id, agentConfig.systemPromptId)).get();
            if (personality) personalityPrompt = personality.content;
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
        if (!ollamaConfig) throw new Error("Ollama not configured.");

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
            personalityPrompt,
            enabledSkills,
            enabledTools,
            ollamaConfig,
            initialFileContent: this.filePath ? (fileContents[this.filePath] || "") : "",
            fileContents
        };
    }
}
