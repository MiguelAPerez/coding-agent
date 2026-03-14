import { ContextData, ChatClient } from "./types";
import { OllamaClient } from "./ollama-client";
import { ClaudeClient } from "./anthropic-client";

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
