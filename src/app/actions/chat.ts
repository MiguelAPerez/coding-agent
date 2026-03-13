"use server";

import { db } from "@/../db";
import { agentConfigurations, skills, tools, repositories, systemPrompts, ollamaConfigurations } from "@/../db/schema";
import { eq, and, isNull, InferSelectModel } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { getRepoFileContentInternal } from "./files";

// --- Types ---

export interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

interface ChatResponse {
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

// --- Classes ---

class ChatContext {
    constructor(
        public readonly userId: string,
        public readonly repoId: string,
        public readonly agentId?: string,
        public filePath: string | null = null,
        public extraFilePaths: string[] = []
    ) { }

    async load() {
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

interface ContextData {
    repo: InferSelectModel<typeof repositories>;
    agentConfig: InferSelectModel<typeof agentConfigurations>;
    personalityPrompt: string | null;
    enabledSkills: InferSelectModel<typeof skills>[];
    enabledTools: InferSelectModel<typeof tools>[];
    ollamaConfig: InferSelectModel<typeof ollamaConfigurations>;
    initialFileContent: string;
}

class PromptBuilder {
    static buildSystemPrompt(contextData: ContextData, currentFilePath: string | null, currentFileContent: string) {
        const { repo, personalityPrompt, enabledSkills, enabledTools } = contextData;
        let prompt = personalityPrompt || "You are a helpful coding assistant.";

        if (enabledSkills.length > 0) {
            prompt += "\n\nAvailable Skills:\n" + enabledSkills.map((s) => `- ${s.name}: ${s.description}\n${s.content}`).join("\n\n");
        }

        if (enabledTools.length > 0) {
            prompt += "\n\nAvailable Tools:\n" + enabledTools.map((t) => `- ${t.name}: ${t.description}\nSchema: ${t.schema}`).join("\n\n");
        }

        prompt += `\n\nContext:\nRepository: ${repo.fullName}\n`;

        const docsMetadata = repo.docsMetadata ? JSON.parse(repo.docsMetadata) : {};
        const fileList = (docsMetadata.fileList || []) as { path: string; title?: string; description?: string }[];

        if (fileList.length > 0) {
            prompt += "\nAvailable Documentation Files:\n";
            prompt += fileList.map((f) => `- ${f.path}${f.title ? ` (${f.title})` : ""}${f.description ? `: ${f.description}` : ""}`).join("\n");
        }

        if (currentFilePath) {
            prompt += `\nCurrently viewed file: ${currentFilePath}\nContent:\n${currentFileContent}\n`;
        }

        prompt += `
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
        return prompt;
    }
}

class OllamaClient {
    constructor(private readonly config: { url: string }, private readonly model: string, private readonly temperature: number) { }

    async chat(messages: ChatMessage[]): Promise<string> {
        const response = await fetch(`${this.config.url}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: this.model,
                messages,
                stream: false,
                options: { temperature: this.temperature / 100 }
            }),
        });

        if (!response.ok) throw new Error(`Ollama API error: ${response.statusText}`);
        const data = await response.json();
        console.log(data);
        return data.message.content;
    }
}

class InferenceRunner {
    private finalRedirect: string | null;

    constructor(
        private readonly userId: string,
        private readonly repoId: string,
        private readonly contextData: ContextData,
        private readonly ollama: OllamaClient
    ) {
        this.finalRedirect = null;
    }

    async run(prompt: string, initialFilePath: string | null, initialFileContent: string): Promise<ChatResponse> {
        const messages: ChatMessage[] = [
            { role: "system", content: "" }, // Placeholder, will be updated in the loop
            { role: "user", content: prompt }
        ];

        let currentFilePath = initialFilePath;
        let currentFileContent = initialFileContent;
        let currentRedirect = initialFilePath;

        for (let step = 0; step < 3; step++) {
            console.log(`[Chat Inference] Step ${step + 1}/3...`);
            const systemPrompt = PromptBuilder.buildSystemPrompt(this.contextData, currentFilePath, currentFileContent);
            messages[0].content = systemPrompt; // Refresh system prompt with new context if navigated

            const content = await this.ollama.chat(messages);

            const jsonMatch = content.match(/\{[\s\S]*\}/);
            let parsed = null;
            if (jsonMatch) {
                try {
                    parsed = JSON.parse(jsonMatch[0]);
                } catch (e) {
                    console.warn("Found JSON-like content but failed to parse:", e);
                }
            }

            if (parsed) {
                if (parsed.redirect && step < 2) {
                    const newPath = parsed.redirect;
                    if (newPath !== currentFilePath) {
                        console.log(`[Chat Inference] Navigating to: ${newPath}`);
                        try {
                            const newContent = await getRepoFileContentInternal(this.repoId, newPath, this.userId);
                            const cleanedContent = newContent.replace(/^---\s*[\s\S]*?---\s*/, '');

                            messages.push({ role: "assistant", content });
                            messages.push({
                                role: "user",
                                content: `Observation: You are now seeing the FULL content of "${newPath}".\n\nContent:\n${cleanedContent}\n\nPlease provide your final answer based on this new information.`
                            });

                            currentFilePath = newPath;
                            currentFileContent = cleanedContent;
                            currentRedirect = newPath;
                            continue;
                        } catch (e) {
                            console.error(`Failed to navigate to ${newPath}:`, e);
                        }
                    }
                }

                return {
                    message: parsed.message || content,
                    redirect: parsed.redirect || currentRedirect
                };
            }

            return {
                message: content,
                redirect: currentRedirect
            };
        }

        throw new Error("Maximum inference steps reached.");
    }
}

// --- Public Actions ---

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

    const extraPaths = extractMentionedPaths(prompt + " " + history.map(m => m.content).join(" "));

    const context = new ChatContext(session.user.id, repoId, agentId, filePath, extraPaths);
    const contextData = await context.load();

    const ollama = new OllamaClient(
        contextData.ollamaConfig,
        contextData.agentConfig.model!,
        contextData.agentConfig.temperature
    );

    // Build the system prompt with the "Diff Generator" skill
    let systemPrompt = contextData.personalityPrompt || "You are a helpful coding assistant.";

systemPrompt += `

### CRITICAL: HOW TO SUGGEST CODE CHANGES
1. For **EACH** file you want to change, you **MUST** wrap the code in these EXACT markers:

**[INTERNAL_FILE_CHANGE_START: path/to/file.ext]**
\`\`\`
ENTIRE content of the file goes here
\`\`\`
**[INTERNAL_FILE_CHANGE_END: path/to/file.ext]**

2. **WARNING: FULL FILE REPLACEMENT ONLY**. You must provide the **ENTIRE** content of the file from top to bottom. 
   - DO NOT use diff format (-/+).
   - DO NOT use comments like "// ... rest of code". 
   - **Omission is Deletion**: If you leave a line out, it will be DELETED from the user's workspace.
3. You can suggest changes for multiple files. Each MUST have its own START and END markers.
4. **DO NOT** add any frontmatter, YAML headers, or "---" delimiters at the top of your response.
5. Provide a brief, human-friendly summary of your changes **AFTER** the code blocks.
`;

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

function extractMentionedPaths(text: string): string[] {
    const paths: string[] = [];
    const mentionRegex = /@([^\s\n\`]+)/g;
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
        paths.push(match[1]);
    }
    return Array.from(new Set(paths));
}

function parseDiffs(content: string, activeFilePath: string | null, fileContents: Record<string, string>): { suggestion: PendingSuggestion, cleanContent: string } {
    const filesChanged: Record<string, FileChange> = {};
    let cleanContent = content;

    // 1. Primary: START/END markers (Robust Split and Conquer)
    // Looking for START markers to find all potential file blocks.
    // Handles optional bolding **[...]** around markers.
    const startRegex = /(?:\*\*|)\s*\[INTERNAL_FILE_CHANGE_START:\s*([^\s\]\n]+)\]\s*(?:\*\*|)/gi;
    
    const matches: { index: number, length: number, path: string }[] = [];
    let m;
    while ((m = startRegex.exec(content)) !== null) {
        matches.push({
            index: m.index,
            length: m[0].length,
            path: m[1]
        });
    }

    const blocksToRemove: { start: number, end: number }[] = [];

    for (let i = 0; i < matches.length; i++) {
        const current = matches[i];
        const next = matches[i + 1];
        
        const blockEnd = next ? next.index : content.length;
        
        // Search for an END marker for THIS path within this range (optional but preferred)
        const escapedPath = current.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const endRegex = new RegExp(`(?:\\*\\*|)\\s*\\[INTERNAL_FILE_CHANGE_END:\\s*${escapedPath}\\]\\s*(?:\\*\\*|)`, 'i');
        const endMatch = endRegex.exec(content.substring(current.index, blockEnd));
        
        let contentEnd = blockEnd;
        if (endMatch) {
            contentEnd = current.index + endMatch.index + endMatch[0].length;
        }
        
        const fileContentBlock = content.substring(current.index, contentEnd);
        
        // Extract the FIRST code block within this fileContentBlock
        const codeMatch = /```(?:[\w-]*)?\n([\s\S]*?)\n```/.exec(fileContentBlock);
        if (codeMatch) {
            filesChanged[current.path] = {
                startLine: 0,
                endLine: 0,
                column: 0,
                originalContent: fileContents[current.path] || "",
                suggestedContent: codeMatch[1].trim()
            };
            blocksToRemove.push({ start: current.index, end: contentEnd });
        }
    }

    // Sort reverse and remove identified blocks from cleanContent
    blocksToRemove.sort((a, b) => b.start - a.start);
    for (const b of blocksToRemove) {
        cleanContent = cleanContent.substring(0, b.start) + cleanContent.substring(b.end);
    }

    // 2. Fallback: Search for @path or FILE: path followed by code block (for cases with NO Start markers)
    const looseRegex = /(?:@|FILE:\s*)([^\s\n\`]+)[^`]{0,150}```(?:[\w-]*)?\n([\s\S]*?)\n```/gi;
    cleanContent = cleanContent.replace(looseRegex, (match, path, code) => {
        if (!filesChanged[path]) {
            filesChanged[path] = {
                startLine: 0,
                endLine: 0,
                column: 0,
                originalContent: fileContents[path] || "",
                suggestedContent: code.trim()
            };
            return ""; 
        }
        return match; 
    });

    // 3. Last Resort: Orphan code block for active file (if NO other files changed)
    if (Object.keys(filesChanged).length === 0 && activeFilePath) {
        const orphanRegex = /```[\s\S]*?\n([\s\S]*?)```/g;
        cleanContent = cleanContent.replace(orphanRegex, (match, code) => {
            if (Object.keys(filesChanged).length === 0) {
                filesChanged[activeFilePath] = {
                    startLine: 0,
                    endLine: 0,
                    column: 0,
                    originalContent: fileContents[activeFilePath] || "",
                    suggestedContent: code.trim()
                };
                return "";
            }
            return match;
        });
    }

    // Final Cleanup: strip any stray markers or labels that might have leaked
    cleanContent = cleanContent.replace(/(?:\*\*|)\s*\[INTERNAL_FILE_CHANGE(?:_START|_END|):?\s*[^\s\]\n]*\]\s*(?:\*\*|)/gi, '');
    cleanContent = cleanContent.replace(/(?:FILE|FILE_CHANGE|PATH):\s*[^\s\n]+/gi, '');

    return {
        suggestion: {
            chatId: Date.now(),
            messages: [],
            filesChanged
        },
        cleanContent: cleanContent.trim().replace(/\n{3,}/g, '\n\n')
    };
}
