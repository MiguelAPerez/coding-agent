import Anthropic from "@anthropic-ai/sdk";
import { ChatMessage, ChatClient } from "./types";
import { db } from "@/../db";
import { anthropicConfigurations } from "@/../db/schema";
import { eq, sql } from "drizzle-orm";

export class ClaudeClient implements ChatClient {
    private client: Anthropic;

    constructor(
        private readonly config: { id: string; apiKey: string },
        private readonly model: string,
        private readonly temperature: number
    ) {
        this.client = new Anthropic({
            apiKey: config.apiKey,
        });
    }

    async chat(messages: ChatMessage[]): Promise<{ content: string; usage?: { promptTokens: number; completionTokens: number } }> {
        const systemMessage = messages.find(m => m.role === 'system');
        const userMessages = messages.filter(m => m.role !== 'system');

        const response = await this.client.messages.create({
            model: this.model,
            max_tokens: 4096,
            system: systemMessage?.content,
            messages: userMessages.map(m => ({
                role: m.role as 'user' | 'assistant',
                content: m.content
            })),
            temperature: this.temperature / 100,
        });

        // Update token usage
        if (response.usage) {
            await this.updateUsage(response.usage.input_tokens, response.usage.output_tokens);
        }

        const firstBlock = response.content[0];
        if (firstBlock.type === 'text') {
            return {
                content: firstBlock.text,
                usage: response.usage ? {
                    promptTokens: response.usage.input_tokens,
                    completionTokens: response.usage.output_tokens
                } : undefined
            };
        }
        return { content: "" };
    }

    async *streamChat(messages: ChatMessage[]): AsyncGenerator<string | { usage: { promptTokens: number; completionTokens: number } }> {
        const systemMessage = messages.find(m => m.role === 'system');
        const userMessages = messages.filter(m => m.role !== 'system');

        const stream = await this.client.messages.create({
            model: this.model,
            max_tokens: 4096,
            system: systemMessage?.content,
            messages: userMessages.map(m => ({
                role: m.role as 'user' | 'assistant',
                content: m.content
            })),
            temperature: this.temperature / 100,
            stream: true,
        });

        let finalUsage: { promptTokens: number; completionTokens: number } | undefined;

        for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
                yield chunk.delta.text;
            } else if (chunk.type === 'message_stop' && (chunk as unknown as { usage?: { input_tokens: number; output_tokens: number } }).usage) {
                const usage = (chunk as unknown as { usage: { input_tokens: number; output_tokens: number } }).usage;
                await this.updateUsage(usage.input_tokens, usage.output_tokens);
                finalUsage = { promptTokens: usage.input_tokens, completionTokens: usage.output_tokens };
            } else if (chunk.type === 'message_start' && chunk.message.usage) {
                 await this.updateUsage(chunk.message.usage.input_tokens, 0);
            } else if (chunk.type === 'message_delta' && chunk.usage) {
                 await this.updateUsage(0, chunk.usage.output_tokens);
                 // message_delta might have the accumulated output tokens
                 if (finalUsage) {
                     finalUsage.completionTokens = chunk.usage.output_tokens;
                 } else {
                     finalUsage = { promptTokens: 0, completionTokens: chunk.usage.output_tokens };
                 }
            }
        }
        
        if (finalUsage) {
            yield { usage: finalUsage };
        }
    }

    private async updateUsage(inputTokens: number, outputTokens: number) {
        if (inputTokens === 0 && outputTokens === 0) return;
        
        try {
            await db.update(anthropicConfigurations)
                .set({
                    totalInputTokens: sql`${anthropicConfigurations.totalInputTokens} + ${inputTokens}`,
                    totalOutputTokens: sql`${anthropicConfigurations.totalOutputTokens} + ${outputTokens}`,
                    updatedAt: new Date()
                })

                .where(eq(anthropicConfigurations.id, this.config.id))
                .run();
        } catch (e) {
            console.error("Failed to update Anthropic token usage:", e);
        }
    }
}
