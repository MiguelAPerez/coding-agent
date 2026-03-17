import { OllamaClient } from "../ollama-client";
import { ChatMessage } from "../types";
import { Ollama } from "ollama";

jest.mock("ollama");

describe("OllamaClient", () => {
    const config = { url: "http://ollama:11434" };
    const model = "test-model";
    const temperature = 70;
    let client: OllamaClient;
    let mockOllamaInstance: { chat: jest.Mock };

    beforeEach(() => {
        mockOllamaInstance = {
            chat: jest.fn()
        };
        (Ollama as jest.Mock).mockImplementation(() => mockOllamaInstance);
        client = new OllamaClient(config, model, temperature);
        jest.spyOn(console, "error").mockImplementation(() => { });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("should perform a successful non-streaming chat", async () => {
        mockOllamaInstance.chat.mockReturnValue({
            message: { role: "assistant", content: "Hello", thinking: "Thought 1" },
            prompt_eval_count: 10,
            eval_count: 5,
            done: true
        });

        const messages: ChatMessage[] = [{ role: "user", content: "hi" }];
        const response = await client.chat(messages);

        expect(response.content).toBe("Hello");
        expect(response.thinking).toBe("Thought 1");
        expect(response.usage).toEqual({
            promptTokens: 10,
            completionTokens: 5,
            totalTokens: 15
        });
        expect(mockOllamaInstance.chat).toHaveBeenCalledWith(
            expect.objectContaining({
                model,
                messages: [{ role: "user", content: "hi" }],
                stream: false,
                options: { temperature: 0.7 }
            })
        );
    });

    it("should throw error if non-streaming chat fails", async () => {
        mockOllamaInstance.chat.mockRejectedValue(new Error("Network Error"));

        await expect(client.chat([])).rejects.toThrow("Network Error");
    });

    it("should perform a successful streaming chat", async () => {
        const mockParts = [
            { message: { content: "Part 1" }, done: false },
            { message: { content: "Part 2" }, done: false },
            { done: true, prompt_eval_count: 5, eval_count: 5 }
        ];

        async function* mockStream() {
            for (const part of mockParts) {
                yield part;
            }
        }

        mockOllamaInstance.chat.mockReturnValue(mockStream());

        const generator = client.streamChat([{ role: "user", content: "stream me" } as ChatMessage]);
        const results = [];
        for await (const chunk of generator) {
            results.push(chunk);
        }

        expect(results).toEqual([
            "Part 1",
            "Part 2",
            { usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 } }
        ]);
    });

    it("should capture thinking content in streaming", async () => {
        const mockParts = [
            { message: { content: "Hello", thinking: "I am thinking" }, done: false },
            { done: true, prompt_eval_count: 5, eval_count: 5 }
        ];

        async function* mockStream() {
            for (const part of mockParts) {
                yield part;
            }
        }

        mockOllamaInstance.chat.mockReturnValue(mockStream());

        const generator = client.streamChat([]);
        const results = [];
        for await (const chunk of generator) {
            results.push(chunk);
        }

        expect(results).toEqual([
            "Hello",
            { thinking: "I am thinking" },
            { usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 } }
        ]);
    });

    it("should handle error in streaming chat", async () => {
        async function* mockErrorStream() {
            yield { message: { content: "Part 1" }, done: false };
            throw new Error("Stream failure");
        }

        mockOllamaInstance.chat.mockReturnValue(mockErrorStream());

        const generator = client.streamChat([]);
        await expect(generator.next()).resolves.toEqual({ value: "Part 1", done: false });
        await expect(generator.next()).rejects.toThrow("Stream failure");
    });

    it("should handle missing usage at end of stream", async () => {
        const mockParts = [
            { message: { content: "Final" }, done: false }
            // No part with done: true
        ];

        async function* mockStream() {
            for (const part of mockParts) {
                yield part;
            }
        }

        mockOllamaInstance.chat.mockReturnValue(mockStream());

        const generator = client.streamChat([]);
        const results = [];
        for await (const chunk of generator) {
            results.push(chunk);
        }

        expect(results).toEqual(["Final", { usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } }]);
    });
});
