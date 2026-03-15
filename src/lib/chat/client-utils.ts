export interface ChatStreamOptions {
    prompt: string;
    repoId?: string | null;
    filePath?: string | null;
    agentId?: string | null;
    workMode?: string;
    history?: { role: string; content: string }[];
    sysPrompt?: string | null;
}

/**
 * Utility for streaming chat responses from the API.
 * 
 * @param options Chat options matching the /api/chat endpoint
 * @param onChunk Callback for each text chunk received
 * @returns The full accumulated content string
 */
export async function streamChatResponse(
    options: ChatStreamOptions,
    onChunk: (chunk: string) => void
): Promise<string> {
    const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options)
    });

    if (!response.ok) {
        throw new Error(`Chat API error: ${response.status} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
        throw new Error("No response body reader available");
    }

    const decoder = new TextDecoder();
    let accumulatedContent = "";

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            accumulatedContent += chunk;
            onChunk(chunk);
        }
    } finally {
        if (reader.releaseLock) {
            reader.releaseLock();
        }
    }

    return accumulatedContent;
}
