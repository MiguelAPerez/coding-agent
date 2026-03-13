import { ChatMessage } from "./types";

export class OllamaClient {
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
        return data.message.content;
    }

    async *streamChat(messages: ChatMessage[]): AsyncGenerator<string> {
        const response = await fetch(`${this.config.url}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: this.model,
                messages,
                stream: true,
                options: { temperature: this.temperature / 100 }
            }),
        });

        if (!response.ok) throw new Error(`Ollama API error: ${response.statusText}`);
        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            
            // Keep the last partial line in the buffer
            buffer = lines.pop() || "";

            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const json = JSON.parse(line);
                    if (json.done) return;
                    if (json.message?.content) {
                        yield json.message.content;
                    }
                } catch (e) {
                    console.error("Failed to parse chunk", line, e);
                }
            }
        }

        // Handle any remaining content in the buffer
        if (buffer.trim()) {
            try {
                const json = JSON.parse(buffer);
                if (json.message?.content) {
                    yield json.message.content;
                }
            } catch {
                // Ignore final partial parse failure
            }
        }
    }
}
