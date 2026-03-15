import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import UnifiedChatPage from "../page";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

// Mock next-auth
jest.mock("next-auth/react", () => ({
    useSession: jest.fn(),
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
    const mockSession = { data: { user: { id: "user1" } }, status: "authenticated" };

    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue(mockRouter);
        (useSession as jest.Mock).mockReturnValue(mockSession);
        
        // Mock fetch
        global.fetch = jest.fn();
    });

    it("should preserve optimistic messages and NOT call fetchMessages when starting a new chat", async () => {
        // 1. Mock initial loads
        (global.fetch as jest.Mock)
            .mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) })) // fetchThreads
            .mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) })); // fetchAgents

        render(<UnifiedChatPage />);

        // Wait for initial load
        await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));

        // 2. Mock new chat creation
        (global.fetch as jest.Mock)
            .mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ id: "new-chat-id", title: "hello world" }) })); // createChat (POST /api/chats)
        
        // 3. Mock message saving
        (global.fetch as jest.Mock)
            .mockImplementationOnce(() => Promise.resolve({ ok: true })); // save user message (POST /api/chats/new-chat-id/messages)

        // 4. Mock chat inference stream
        const mockStream = new ReadableStream({
            start(controller) {
                controller.enqueue(new TextEncoder().encode("Hello! I am your assistant."));
                controller.close();
            }
        });
        (global.fetch as jest.Mock)
            .mockImplementationOnce(() => Promise.resolve({ ok: true, body: mockStream })); // chat inference (POST /api/chat)

        // 5. Trigger send message
        const sendBtn = screen.getByText("Send Message");
        fireEvent.click(sendBtn);

        // Verify that createChat was called
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith("/api/chats", expect.anything());
        });

        // The critical part: 
        // When setActiveThreadId("new-chat-id") is called, the useEffect triggers.
        // It should NOT call fetchMessages ("/api/chats/new-chat-id/messages") because messages.length > 0 (optimistic user message).
        
        // Let's verify messages are shown in the UI
        await waitFor(() => {
            expect(screen.getByTestId("messages-count")).toHaveTextContent("2"); // User + Assistant (after stream)
            expect(screen.getByTestId("message-0")).toHaveTextContent("hello world");
        });

        // Verify no fetch calls to get messages were made during this process
        const fetchCalls = (global.fetch as jest.Mock).mock.calls;
        const getMessagesCalls = fetchCalls.filter(call => call[0].includes("/messages") && call[1]?.method === undefined); // GET calls to /messages
        
        expect(getMessagesCalls.length).toBe(0);
    });

    it("should fetch messages normally when switching to an existing thread with no messages loaded", async () => {
        // 1. Mock initial loads
        (global.fetch as jest.Mock)
            .mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve([{ id: "thread1", title: "Existing Chat" }]) })) // fetchThreads
            .mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) })); // fetchAgents

        render(<UnifiedChatPage />);

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
