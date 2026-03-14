import { ContextData, ChatClient } from "./types";
import { OllamaClient } from "./ollama-client";
import { ClaudeClient } from "./anthropic-client";
import { GoogleClient } from "./google-client";

export class ChatClientFactory {
    static getClient(context: ContextData): ChatClient {
        const provider = context.agentConfig.provider || 'ollama';

        if (provider === 'anthropic' || provider === 'claude') {
            if (!context.anthropicConfig) {
                throw new Error("Anthropic/Claude is not configured. Please add your API key in Settings.");
            }
            return new ClaudeClient(
                {
                    id: context.anthropicConfig.id,
                    apiKey: context.anthropicConfig.apiKey
                },
                context.agentConfig.model,
                context.agentConfig.temperature
            );
        }

        if (provider === 'google') {
            if (!context.googleConfig) {
                throw new Error("Google Gemini is not configured. Please add your API key in Settings.");
            }
            return new GoogleClient(
                {
                    id: context.googleConfig.id,
                    apiKey: context.googleConfig.apiKey
                },
                context.agentConfig.model,
                context.agentConfig.temperature
            );
        }

        // Default to Ollama
        if (!context.ollamaConfig) {
            throw new Error("Ollama is not configured. Please set your Ollama URL in Settings.");
        }
        return new OllamaClient(
            context.ollamaConfig,
            context.agentConfig.model,
            context.agentConfig.temperature
        );
    }
}
