import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { ChatContext } from "@/lib/chat/context";
import { ChatClientFactory } from "@/lib/chat/client-factory";
import { extractMentionedPaths } from "@/lib/chat/utils";

import { getPromptFromFile } from "@/app/actions/prompts";

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

        const chatClient = ChatClientFactory.getClient(contextData);


        let systemPrompt = await getPromptFromFile("CODER");
        if (contextData.agentPersonalityPrompt) {
            systemPrompt = `${contextData.agentPersonalityPrompt}\n\n${systemPrompt}`;
        }

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
                    for await (const chunk of chatClient.streamChat(messages)) {

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
