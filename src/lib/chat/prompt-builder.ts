import { ContextData, WorkMode } from "./types";
import { getSystempPromptFromFile } from "@/app/actions/prompts";
import { trace, SpanStatusCode } from "@opentelemetry/api";

const tracer = trace.getTracer("prompt-builder");

/**
 * This class is used to build the system prompt to start a chat with the agent.
 */
export class PromptBuilder {
    static async buildSystemPrompt(
        contextData: ContextData,
        currentFilePath: string | null,
        currentFileContent: string,
        workMode: WorkMode,
        sysPrompt: string | null = null
    ) {
        return tracer.startActiveSpan("prompt_builder.buildSystemPrompt", async (span) => {
            try {
                span.setAttributes({
                    "work_mode": workMode,
                    "has_sys_prompt": !!sysPrompt
                });
                const { repo, agentPersonalityPrompt, enabledSkills, enabledTools } = contextData;

                // 1. [PERSONALITY]
                let personality = contextData.agentPersonality || agentPersonalityPrompt;
                if (!personality) {
                    personality = await getSystempPromptFromFile("DEFAULT_PERSONALITY");
                }

                // 2. [IDENTITY]
                const identity = contextData.agentIdentity || await getSystempPromptFromFile("IDENTITY");

                // 3. [WORKFLOW]
                const workflow = contextData.agentWorkflow || await getSystempPromptFromFile("WORKFLOW");

                // 4. [SKILLS]
                let skillsSection = "";
                if (enabledSkills.length > 0) {
                    skillsSection = "Available Skills:\n" + enabledSkills.map((s) => `- ${s.name}: ${s.description}\n${s.content}`).join("\n\n");
                }

                // 5. [TOOLS]
                let toolsSection = "";
                if (enabledTools.length > 0) {
                    toolsSection = "Available Tools:\n" + enabledTools.map((t) => `- ${t.name}: ${t.description}\nSchema: ${t.schema}`).join("\n\n");
                }

                // 6. [CONTEXT]
                let contextSection = "";
                if (repo) {
                    contextSection += `Repository: ${repo.fullName}\n`;

                    const docsMetadata = repo.docsMetadata ? JSON.parse(repo.docsMetadata) : {};
                    const fileList = (docsMetadata.fileList || []) as { path: string; title?: string; description?: string }[];

                    if (fileList.length > 0) {
                        contextSection += "\nAvailable Documentation Files:\n";
                        contextSection += fileList.map((f) => `- ${f.path}${f.title ? ` (${f.title})` : ""}${f.description ? `: ${f.description}` : ""}`).join("\n");
                    }
                }

                if (currentFilePath) {
                    contextSection += `\nCurrently viewed file: ${currentFilePath}\nContent:\n${currentFileContent}\n`;
                }

                // 7. [WORKMODE]
                const modePrompt = await getSystempPromptFromFile(workMode);

                // Assemble the final prompt
                let prompt = `[PERSONALITY]\n${personality}\n\n`;
                prompt += `[IDENTITY]\n${identity}\n\n`;
                prompt += `[WORKFLOW]\n${workflow}\n\n`;

                if (skillsSection) {
                    prompt += `[SKILLS]\n${skillsSection}\n\n`;
                }

                if (toolsSection) {
                    prompt += `[TOOLS]\n${toolsSection}\n\n`;
                }

                if (contextSection) {
                    prompt += `[CONTEXT]\n${contextSection}\n\n`;
                }

                prompt += `[WORKMODE]\n${modePrompt}`;

                if (sysPrompt) {
                    prompt += `\n\n[ADDITIONAL_INSTRUCTIONS]\n${sysPrompt}`;
                }

                span.setAttributes({ "prompt.length": prompt.length });
                return prompt;
            } catch (error) {
                span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : "Unknown error" });
                throw error;
            } finally {
                span.end();
            }
        });
    }
}
