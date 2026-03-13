import { ContextData } from "./types";

export class PromptBuilder {
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
