import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { ChatContext } from "@/lib/chat/context";
import { OllamaClient } from "@/lib/chat/ollama-client";
import { extractMentionedPaths } from "@/lib/chat/utils";

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { repoId, filePath, prompt, agentId, history } = await req.json();

        if (!repoId || !prompt || !agentId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const userId = session.user.id;
        const extraPaths = extractMentionedPaths(prompt + " " + (history || []).map((m: { content: string }) => m.content).join(" "));
        const context = new ChatContext(userId, repoId, agentId, filePath, extraPaths);
        const contextData = await context.load();

        const ollama = new OllamaClient(
            contextData.ollamaConfig,
            contextData.agentConfig.model!,
            contextData.agentConfig.temperature
        );

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
4. **CRITICAL**: **DO NOT** use horizontal rules (three dashes), decorators, or "Summary of Changes" markers at the top of your response. 
5. Provide a brief, human-friendly summary of your changes **ONLY AFTER** all code blocks.
6. **NO FRONTMATTER**: Do not add any YAML headers or delimiters at the top of your response content.
`;

        if (contextData.enabledSkills.length > 0) {
            systemPrompt += "\n\nAvailable Skills:\n" + contextData.enabledSkills.map((s) => `- ${s.name}: ${s.description}\n${s.content}`).join("\n\n");
        }

        const messages = [
            { role: "system", content: systemPrompt },
            ...(history || []),
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

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of ollama.streamChat(messages)) {
                        controller.enqueue(encoder.encode(chunk));
                    }
                    controller.close();
                } catch (e) {
                    controller.error(e);
                }
            },
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Transfer-Encoding": "chunked",
            },
        });
    } catch (error) {
        console.error("API Chat Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
