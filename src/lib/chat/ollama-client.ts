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
        console.log(data);
        return data.message.content;
    }
}
