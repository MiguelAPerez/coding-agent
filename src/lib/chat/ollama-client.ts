import { ChatMessage, ChatClient, Usage } from "./types";
import { trace, SpanStatusCode } from "@opentelemetry/api";
import { Ollama } from "ollama";

const tracer = trace.getTracer("ollama-client");

export class OllamaClient implements ChatClient {
    private client: Ollama;

    constructor(private readonly config: { url: string }, private readonly model: string, private readonly temperature: number) {
        this.client = new Ollama({ host: this.config.url });
    }

    async chat(messages: ChatMessage[]): Promise<{ content: string; thinking?: string; usage?: Usage }> {
        return tracer.startActiveSpan("ollama.chat", async (span) => {
            try {
                span.setAttributes({
                    "gen_ai.model_name": this.model,
                    "gen_ai.system": "ollama",
                    "gen_ai.request.temperature": this.temperature / 100,
                });

                const response = await this.client.chat({
                    model: this.model,
                    messages: messages.map(m => ({ role: m.role, content: m.content })),
                    stream: false,
                    options: { temperature: this.temperature / 100 }
                });

                const usage = {
                    promptTokens: response.prompt_eval_count || 0,
                    completionTokens: response.eval_count || 0,
                    totalTokens: (response.prompt_eval_count || 0) + (response.eval_count || 0)
                };

                span.setAttributes({
                    "gen_ai.response.input_tokens": usage.promptTokens,
                    "gen_ai.response.output_tokens": usage.completionTokens,
                });

                return {
                    content: response.message.content,
                    thinking: (response.message as { thinking?: string }).thinking,
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

    async *streamChat(messages: ChatMessage[]): AsyncGenerator<string | { thinking: string } | { usage: Usage }> {
        const span = tracer.startSpan("ollama.streamChat", {
            attributes: {
                "gen_ai.model_name": this.model,
                "gen_ai.system": "ollama",
                "gen_ai.request.temperature": this.temperature / 100,
            },
        });

        try {
            const response = await this.client.chat({
                model: this.model,
                messages: messages.map(m => ({ role: m.role, content: m.content })),
                stream: true,
                options: { temperature: this.temperature / 100 }
            });

            let yieldedUsage = false;

            for await (const part of response) {
                if (part.message) {
                    if (part.message.content) {
                        yield part.message.content;
                    }
                    const thinking = (part.message as { thinking?: string }).thinking;
                    if (thinking) {
                        yield { thinking } as { thinking: string };
                    }
                }

                if (part.done) {
                    const usage: Usage = {
                        promptTokens: part.prompt_eval_count || 0,
                        completionTokens: part.eval_count || 0,
                        totalTokens: (part.prompt_eval_count || 0) + (part.eval_count || 0)
                    };
                    span.setAttributes({
                        "gen_ai.response.input_tokens": usage.promptTokens,
                        "gen_ai.response.output_tokens": usage.completionTokens,
                    });
                    yield { usage } as { usage: Usage };
                    yieldedUsage = true;
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
                } as { usage: Usage };
            }
        } catch (error) {
            span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : "Unknown error" });
            throw error;
        } finally {
            span.end();
        }
    }
}
