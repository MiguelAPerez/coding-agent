import { OllamaClient } from "../ollama-client";
import { ChatMessage } from "../types";

describe("OllamaClient", () => {
    const config = { url: "http://ollama:11434" };
    const model = "test-model";
    const temperature = 70;
    let client: OllamaClient;

    beforeEach(() => {
        client = new OllamaClient(config, model, temperature);
        global.fetch = jest.fn();
        jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("should perform a successful non-streaming chat", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue({
                message: { content: "hello world" }
            }),
        });

        const messages: ChatMessage[] = [{ role: "user", content: "hi" }];
        const response = await client.chat(messages);

        expect(response.content).toBe("hello world");
        expect(global.fetch).toHaveBeenCalledWith(
            "http://ollama:11434/api/chat",
            expect.objectContaining({
                method: "POST",
                body: JSON.stringify({
                    model,
                    messages,
                    stream: false,
                    options: { temperature: 0.7 }
                })
            })
        );
    });

    it("should throw error if non-streaming chat fails", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: false,
            statusText: "Not Found",
        });

        await expect(client.chat([])).rejects.toThrow("Ollama API error: Not Found");
    });

    it("should perform a successful streaming chat", async () => {
        const chunks = [
            JSON.stringify({ message: { content: "Part 1" }, done: false }) + "\n",
            JSON.stringify({ message: { content: "Part 2" }, done: false }) + "\n",
            " \n", // Empty line to trigger continue
            JSON.stringify({ done: true }) + "\n",
        ];

        const mockReader = {
            read: jest.fn()
                .mockResolvedValueOnce({ value: new TextEncoder().encode(chunks[0]), done: false })
                .mockResolvedValueOnce({ value: new TextEncoder().encode(chunks[1]), done: false })
                .mockResolvedValueOnce({ value: new TextEncoder().encode(chunks[2]), done: false })
                .mockResolvedValueOnce({ value: new TextEncoder().encode(chunks[3]), done: false })
                .mockResolvedValueOnce({ done: true }),
        };

        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            body: {
                getReader: () => mockReader,
            },
        });

        const generator = client.streamChat([{ role: "user", content: "stream me" } as ChatMessage]);
        const results = [];
        for await (const chunk of generator) {
            results.push(chunk);
        }

        expect(results).toEqual(["Part 1", "Part 2", { usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } }]);
    });

    it("should handle partial JSON chunks in stream", async () => {
        const chunk1 = '{"message": {"content": "He';
        const chunk2 = 'llo"}} \n';

        const mockReader = {
            read: jest.fn()
                .mockResolvedValueOnce({ value: new TextEncoder().encode(chunk1), done: false })
                .mockResolvedValueOnce({ value: new TextEncoder().encode(chunk2), done: false })
                .mockResolvedValueOnce({ done: true }),
        };

        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            body: {
                getReader: () => mockReader,
            },
        });

        const generator = client.streamChat([]);
        const results = [];
        for await (const chunk of generator) {
            results.push(chunk);
        }

        expect(results).toEqual(["Hello", { usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } }]);
    });

    it("should throw error if stream chat fails", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: false,
            statusText: "Internal Server Error",
        });

        const generator = client.streamChat([]);
        await expect(generator.next()).rejects.toThrow("Ollama API error: Internal Server Error");
    });

    it("should handle missing body in streaming response", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            body: null,
        });

        const generator = client.streamChat([]);
        await expect(generator.next()).rejects.toThrow("No response body");
    });

    it("should log parsing errors in stream and continue", async () => {
        const badChunk = "invalid json\n" + JSON.stringify({ message: { content: "valid" } }) + "\n";

        const mockReader = {
            read: jest.fn()
                .mockResolvedValueOnce({ value: new TextEncoder().encode(badChunk), done: false })
                .mockResolvedValueOnce({ done: true }),
        };

        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            body: {
                getReader: () => mockReader,
            },
        });

        const generator = client.streamChat([]);
        const results = [];
        for await (const chunk of generator) {
            results.push(chunk);
        }

        expect(results).toEqual(["valid", { usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } }]);
        expect(console.error).toHaveBeenCalled();
    });

    it("should handle remaining buffer at end of stream", async () => {
        const chunk = JSON.stringify({ message: { content: "Final" } }); // No newline

        const mockReader = {
            read: jest.fn()
                .mockResolvedValueOnce({ value: new TextEncoder().encode(chunk), done: false })
                .mockResolvedValueOnce({ done: true }),
        };

        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            body: {
                getReader: () => mockReader,
            },
        });

        const generator = client.streamChat([]);
        const results = [];
        for await (const chunk of generator) {
            results.push(chunk);
        }

        expect(results).toEqual(["Final", { usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } }]);
    });

    it("should handle JSON with no content", async () => {
        const chunk = JSON.stringify({ message: {} }) + "\n"; // No content

        const mockReader = {
            read: jest.fn()
                .mockResolvedValueOnce({ value: new TextEncoder().encode(chunk), done: false })
                .mockResolvedValueOnce({ done: true }),
        };

        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            body: {
                getReader: () => mockReader,
            },
        });

        const generator = client.streamChat([]);
        const result = await generator.next();
        expect(result.value).toEqual({ usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } });
        expect(result.done).toBe(false);
        const secondResult = await generator.next();
        expect(secondResult.done).toBe(true);
    });
});
