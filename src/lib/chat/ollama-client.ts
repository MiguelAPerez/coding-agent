import { ChatMessage, ChatClient, Usage } from "./types";
import { trace, SpanStatusCode } from "@opentelemetry/api";

const tracer = trace.getTracer("ollama-client");

export class OllamaClient implements ChatClient {
    constructor(private readonly config: { url: string }, private readonly model: string, private readonly temperature: number) { }

    async chat(messages: ChatMessage[]): Promise<{ content: string; usage?: Usage }> {
        return tracer.startActiveSpan("ollama.chat", async (span) => {
            try {
                span.setAttributes({
                    "gen_ai.model_name": this.model,
                    "gen_ai.system": "ollama",
                    "gen_ai.request.temperature": this.temperature / 100,
                });
                console.log("messages", messages);
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

                const usage = {
                    promptTokens: data.prompt_eval_count || 0,
                    completionTokens: data.eval_count || 0,
                    totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
                };

                span.setAttributes({
                    "gen_ai.response.input_tokens": usage.promptTokens,
                    "gen_ai.response.output_tokens": usage.completionTokens,
                });

                return {
                    content: data.message.content,
                    usage
                };
            } catch (error) {
                span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : "Unknown error" });
                throw error;
            } finally {
                span.end();
            }
        });
    }

    async *streamChat(messages: ChatMessage[]): AsyncGenerator<string | { usage: Usage }> {
        const span = tracer.startSpan("ollama.streamChat", {
            attributes: {
                "gen_ai.model_name": this.model,
                "gen_ai.system": "ollama",
                "gen_ai.request.temperature": this.temperature / 100,
            },
        });

        try {
            console.log("messages", messages);
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
            let yieldedUsage = false;

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
                        if (json.done) {
                            const usage = {
                                promptTokens: json.prompt_eval_count || 0,
                                completionTokens: json.eval_count || 0,
                                totalTokens: (json.prompt_eval_count || 0) + (json.eval_count || 0)
                            };
                            span.setAttributes({
                                "gen_ai.response.input_tokens": usage.promptTokens,
                                "gen_ai.response.output_tokens": usage.completionTokens,
                            });
                            yield { usage };
                            yieldedUsage = true;
                            return;
                        }
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
                    if (json.done) {
                        const usage = {
                            promptTokens: json.prompt_eval_count || 0,
                            completionTokens: json.eval_count || 0,
                            totalTokens: (json.prompt_eval_count || 0) + (json.eval_count || 0)
                        };
                        span.setAttributes({
                            "gen_ai.response.input_tokens": usage.promptTokens,
                            "gen_ai.response.output_tokens": usage.completionTokens,
                        });
                        yield { usage };
                        yieldedUsage = true;
                    }
                } catch {
                    // Ignore final partial parse failure
                }
            }

            // Fallback: Ensure usage is ALWAYS yielded if not already
            if (!yieldedUsage) {
                yield {
                    usage: {
                        promptTokens: 0,
                        completionTokens: 0,
                        totalTokens: 0
                    }
                };
            }
        } catch (error) {
            span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : "Unknown error" });
            throw error;
        } finally {
            span.end();
        }
    }
}
