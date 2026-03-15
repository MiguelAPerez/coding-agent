import { GoogleGenAI } from "@google/genai";
import type { Content, Part } from "@google/genai";
import { ChatMessage, ChatClient, Usage } from "./types";
import { db } from "@/../db";
import { googleConfigurations } from "@/../db/schema";
import { eq, sql } from "drizzle-orm";
import { trace, SpanStatusCode } from "@opentelemetry/api";

const tracer = trace.getTracer("google-client");

export class GoogleClient implements ChatClient {
    private client: GoogleGenAI;

    constructor(
        private readonly config: { id: string; apiKey: string },
        private readonly model: string,
        private readonly temperature: number
    ) {
        this.client = new GoogleGenAI({
            apiKey: config.apiKey,
        });
    }

    private convertMessages(messages: ChatMessage[]): { contents: Content[], systemInstruction?: string } {
        const contents: Content[] = [];
        let systemInstruction: string | undefined;

        for (const msg of messages) {
            if (msg.role === 'system') {
                systemInstruction = msg.content;
                continue;
            }

            contents.push({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content } as Part],
            });
        }

        return { contents, systemInstruction };
    }

    async chat(messages: ChatMessage[]): Promise<{ content: string; usage?: Usage }> {
        return tracer.startActiveSpan("google.chat", async (span) => {
            try {
                const { contents, systemInstruction } = this.convertMessages(messages);
                span.setAttributes({
                    "gen_ai.model_name": this.model,
                    "gen_ai.system": "google",
                    "gen_ai.request.temperature": this.temperature / 100,
                });

                const response = await this.client.models.generateContent({
                    model: this.model,
                    contents,
                    config: {
                        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
                        temperature: this.temperature / 100,
                    },
                });

                let usage: Usage | undefined;
                if (response.usageMetadata) {
                    usage = {
                        promptTokens: response.usageMetadata.promptTokenCount || 0,
                        completionTokens: response.usageMetadata.candidatesTokenCount || 0,
                        totalTokens: (response.usageMetadata.promptTokenCount || 0) + (response.usageMetadata.candidatesTokenCount || 0)
                    };
                    span.setAttributes({
                        "gen_ai.response.input_tokens": usage.promptTokens,
                        "gen_ai.response.output_tokens": usage.completionTokens,
                    });
                    await this.updateUsage(usage.promptTokens, usage.completionTokens);
                }

                return {
                    content: response.text || "",
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
        const span = tracer.startSpan("google.streamChat", {
            attributes: {
                "gen_ai.model_name": this.model,
                "gen_ai.system": "google",
                "gen_ai.request.temperature": this.temperature / 100,
            },
        });

        try {
            const { contents, systemInstruction } = this.convertMessages(messages);

            const stream = await this.client.models.generateContentStream({
                model: this.model,
                contents,
                config: {
                    systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
                    temperature: this.temperature / 100,
                },
            });

            let finalUsage: Usage | undefined;

            for await (const chunk of stream) {
                if (chunk.text) {
                    yield chunk.text;
                }
                if (chunk.usageMetadata) {
                    finalUsage = {
                        promptTokens: chunk.usageMetadata.promptTokenCount || 0,
                        completionTokens: chunk.usageMetadata.candidatesTokenCount || 0,
                        totalTokens: (chunk.usageMetadata.promptTokenCount || 0) + (chunk.usageMetadata.candidatesTokenCount || 0)
                    };
                    span.setAttributes({
                        "gen_ai.response.input_tokens": finalUsage.promptTokens,
                        "gen_ai.response.output_tokens": finalUsage.completionTokens,
                    });
                    await this.updateUsage(finalUsage.promptTokens, finalUsage.completionTokens);
                }
            }

            if (finalUsage) {
                yield { usage: finalUsage };
            }
        } catch (error) {
            span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : "Unknown error" });
            throw error;
        } finally {
            span.end();
        }
    }

    private async updateUsage(inputTokens: number, outputTokens: number) {
        if (inputTokens === 0 && outputTokens === 0) return;
        
        try {
            await db.update(googleConfigurations)
                .set({
                    totalInputTokens: sql`${googleConfigurations.totalInputTokens} + ${inputTokens}`,
                    totalOutputTokens: sql`${googleConfigurations.totalOutputTokens} + ${outputTokens}`,
                    updatedAt: new Date()
                })
                .where(eq(googleConfigurations.id, this.config.id))
                .run();
        } catch (e) {
            console.error("Failed to update Google token usage:", e);
        }
    }
}
