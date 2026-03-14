import { GoogleGenAI } from "@google/genai";
import type { Content, Part } from "@google/genai";
import { ChatMessage, ChatClient } from "./types";
import { db } from "@/../db";
import { googleConfigurations } from "@/../db/schema";
import { eq, sql } from "drizzle-orm";

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

    async chat(messages: ChatMessage[]): Promise<string> {
        const { contents, systemInstruction } = this.convertMessages(messages);

        const response = await this.client.models.generateContent({
            model: this.model,
            contents,
            config: {
                systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
                temperature: this.temperature / 100,
            },
        });

        if (response.usageMetadata) {
            await this.updateUsage(response.usageMetadata.promptTokenCount || 0, response.usageMetadata.candidatesTokenCount || 0);
        }
        
        return response.text || "";
    }

    async *streamChat(messages: ChatMessage[]): AsyncGenerator<string> {
        const { contents, systemInstruction } = this.convertMessages(messages);

        const stream = await this.client.models.generateContentStream({
            model: this.model,
            contents,
            config: {
                systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
                temperature: this.temperature / 100,
            },
        });

        for await (const chunk of stream) {
            if (chunk.text) {
                yield chunk.text;
            }
            if (chunk.usageMetadata) {
                await this.updateUsage(chunk.usageMetadata.promptTokenCount || 0, chunk.usageMetadata.candidatesTokenCount || 0);
            }
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
