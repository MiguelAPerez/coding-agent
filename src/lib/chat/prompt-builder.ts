import { ContextData } from "./types";
import { getPromptFromFile } from "@/app/actions/prompts";


/**
 * This class is used to build the system prompt to start a chat with the agent.
 */
export class PromptBuilder {
    static async buildSystemPrompt(
        contextData: ContextData,
        currentFilePath: string | null,
        currentFileContent: string,
        sysPrompt: string | null
    ) {
        const { repo, agentPersonalityPrompt, enabledSkills, enabledTools } = contextData;
        const formatPrompt = await getPromptFromFile("FORMAT");

        let prompt = formatPrompt;

        if (sysPrompt) {
            prompt += `\n\n${sysPrompt}`;
        }

        if (agentPersonalityPrompt) {
            prompt = `${agentPersonalityPrompt}\n\n${prompt}`;
        }

        if (enabledSkills.length > 0) {
            prompt += "\n\nAvailable Skills:\n" + enabledSkills.map((s) => `- ${s.name}: ${s.description}\n${s.content}`).join("\n\n");
        }

        if (enabledTools.length > 0) {
            prompt += "\n\nAvailable Tools:\n" + enabledTools.map((t) => `- ${t.name}: ${t.description}\nSchema: ${t.schema}`).join("\n\n");
        }

        if (repo) {
            prompt += `\n\nContext:\nRepository: ${repo.fullName}\n`;

            const docsMetadata = repo.docsMetadata ? JSON.parse(repo.docsMetadata) : {};
            const fileList = (docsMetadata.fileList || []) as { path: string; title?: string; description?: string }[];

            if (fileList.length > 0) {
                prompt += "\nAvailable Documentation Files:\n";
                prompt += fileList.map((f) => `- ${f.path}${f.title ? ` (${f.title})` : ""}${f.description ? `: ${f.description}` : ""}`).join("\n");
            }
        }

        if (currentFilePath) {
            prompt += `\nCurrently viewed file: ${currentFilePath}\nContent:\n${currentFileContent}\n`;
        }

        return prompt;
    }
}
