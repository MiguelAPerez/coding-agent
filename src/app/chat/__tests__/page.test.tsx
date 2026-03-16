import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ChatPageClient from "../ChatPageClient";
import { useRouter } from "next/navigation";

// Mock actions
jest.mock("@/app/actions/config", () => ({
    getAgentConfigs: jest.fn(() => Promise.resolve([])),
}));

// Mock next/navigation
jest.mock("next/navigation", () => ({
    useRouter: jest.fn(),
}));

// Mock action
jest.mock("@/app/actions/chat", () => ({
    clearChatMessages: jest.fn(),
}));

// Mock components to simplify rendering and focus on logic
jest.mock("@/components/chat/ChatSidebar", () => ({
    __esModule: true,
    default: ({ onThreadSelect, onNewChat }: { onThreadSelect: (id: string) => void; onNewChat: () => void }) => (
        <div data-testid="sidebar">
            <button onClick={() => onThreadSelect("thread1")}>Select Thread</button>
            <button onClick={onNewChat}>New Chat</button>
        </div>
    ),
}));

jest.mock("@/components/chat/ChatInterface", () => ({
    __esModule: true,
    default: ({ onSendMessage, messages }: { onSendMessage: (msg: string) => void; messages: { content: string }[] }) => (
        <div data-testid="interface">
            <div data-testid="messages-count">{messages.length}</div>
            <button onClick={() => onSendMessage("hello world")}>Send Message</button>
            <ul>
                {messages.map((m, i) => (
                    <li key={i} data-testid={`message-${i}`}>{m.content}</li>
                ))}
            </ul>
        </div>
    ),
}));

describe("UnifiedChatPage Regression Test", () => {
    const mockRouter = { push: jest.fn() };

    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue(mockRouter);
        
        // Mock fetch with a default implementation that returns a safe response
        global.fetch = jest.fn(() => Promise.resolve({
            ok: true,
            json: () => Promise.resolve([]),
            body: null
        } as Response));
    });

    it("should preserve optimistic messages and NOT call fetchMessages when starting a new chat", async () => {
        // 1. Mock initial loads
        (global.fetch as jest.Mock)
            .mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) })) // fetchThreads (mount)
            .mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) })); // fetchAgents (mount)

        render(<ChatPageClient initialThreads={[]} initialAgents={[]} />);

        // Wait for a tick to ensure component is ready (optional but safe)
        await waitFor(() => expect(screen.getByTestId("interface")).toBeInTheDocument());

        // 2. Mock sequence for handleSendMessage:
        //    - createChat (POST /api/chats)
        //    - save user message (POST /api/chats/new-chat-id/messages)
        //    - chat inference (POST /api/chat)
        //    - save assistant message (POST /api/chats/new-chat-id/messages)
        //    - fetchThreads (refresh sidebar)

        const mockStream = new ReadableStream({
            start(controller) {
                controller.enqueue(new TextEncoder().encode("Hello! I am your assistant."));
                controller.close();
            }
        });

        (global.fetch as jest.Mock)
            .mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ id: "new-chat-id", title: "hello world" }) })) // createChat
            .mockImplementationOnce(() => Promise.resolve({ ok: true })) // save user message
            .mockImplementationOnce(() => Promise.resolve({ ok: true, body: mockStream })) // chat inference
            .mockImplementationOnce(() => Promise.resolve({ ok: true })) // save assistant message
            .mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) })); // fetchThreads (refresh)

        // 3. Trigger send message
        const sendBtn = screen.getByText("Send Message");
        fireEvent.click(sendBtn);

        // Verify that createChat was called
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith("/api/chats", expect.anything());
        });

        // Verify messages are shown in the UI
        await waitFor(() => {
            expect(screen.getByTestId("messages-count")).toHaveTextContent("2"); // User + Assistant
            expect(screen.getByTestId("message-0")).toHaveTextContent("hello world");
        });

        // Verify no GET fetch calls to get messages were made during this process
        // (Optimistic UI should prevent the automatic re-fetch)
        const fetchCalls = (global.fetch as jest.Mock).mock.calls;
        const getMessagesCalls = fetchCalls.filter(call => 
            call[0].includes("/messages") && 
            (call[1] === undefined || call[1].method === "GET" || !call[1].method)
        );
        
        expect(getMessagesCalls.length).toBe(0);
    });

    it("should fetch messages normally when switching to an existing thread with no messages loaded", async () => {
        // 1. Mock initial loads
        render(<ChatPageClient initialThreads={[{ id: "thread1", title: "Existing Chat", type: "web", updatedAt: new Date(), lastMessage: "" }]} initialAgents={[]} />);

        // 2. Mock fetch messages for thread1
        (global.fetch as jest.Mock)
            .mockImplementationOnce(() => Promise.resolve({ 
                ok: true, 
                json: () => Promise.resolve([
                    { id: "m1", role: "user", content: "hi", createdAt: new Date().toISOString() },
                    { id: "m2", role: "assistant", content: "hello", createdAt: new Date().toISOString() }
                ]) 
            })); // fetchMessages (GET /api/chats/thread1/messages)

        // 3. Select thread
        const selectBtn = screen.getByText("Select Thread");
        fireEvent.click(selectBtn);

        // 4. Verify fetchMessages was called
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith("/api/chats/thread1/messages");
            expect(screen.getByTestId("messages-count")).toHaveTextContent("2");
        });
    });
});
