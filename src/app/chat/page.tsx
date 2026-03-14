"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect } from "react";
import ChatSidebar, { ChatThread } from "@/components/chat/ChatSidebar";
import ChatInterface, { Message } from "@/components/chat/ChatInterface";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function UnifiedChatPage() {
    const router = useRouter();
    const sessionContext = useSession();
    const session = sessionContext?.data;
    const [threads, setThreads] = useState<ChatThread[]>([]);
    const [activeThreadId, setActiveThreadId] = useState<string | undefined>();
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchThreads = async () => {
        try {
            const res = await fetch("/api/chats");
            const data = await res.json();
            setThreads(data.map((t: { id: string; title: string; type: "web" | "discord"; updatedAt: string }) => ({
                id: t.id,
                title: t.title || "Untitled Chat",
                type: t.type,
                updatedAt: new Date(t.updatedAt),
                lastMessage: "Click to view history" // Optional: fetch last message
            })));
        } catch (err) {
            console.error("Failed to fetch threads:", err);
        }
    };

    const fetchMessages = async (chatId: string) => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/chats/${chatId}/messages`);
            const data = await res.json();
            setMessages(data.map((m: { id: string; role: "user" | "assistant" | "system"; content: string; createdAt: string }) => ({
                id: m.id,
                role: m.role,
                content: m.content,
                createdAt: new Date(m.createdAt)
            })));
        } catch (err) {
            console.error("Failed to fetch messages:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (sessionContext?.status === "unauthenticated") {
            router.push("/login");
        } else if (session) {
            fetchThreads();
        }
    }, [session, sessionContext?.status, router]);

    useEffect(() => {
        if (activeThreadId) {
            fetchMessages(activeThreadId);
        } else {
            setMessages([]);
        }
    }, [activeThreadId]);

    const handleSendMessage = async (content: string) => {
        if (!activeThreadId) {
            // Create new chat first
            try {
                const res = await fetch("/api/chats", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title: content.substring(0, 30) + "..." })
                });
                const newChat = await res.json();
                setActiveThreadId(newChat.id);
                // The actual message sending will be handled by the next useEffect trigger or manually
                // For simplicity, let's just trigger another send
                await sendMessageToChat(newChat.id, content);
                fetchThreads(); // Refresh sidebar
            } catch (err) {
                console.error("Failed to create chat:", err);
            }
            return;
        }

        await sendMessageToChat(activeThreadId, content);
    };

    const sendMessageToChat = async (chatId: string, content: string) => {
        setIsLoading(true);
        // Optimistic update
        const userMsg: Message = { id: Date.now().toString(), role: "user", content };
        setMessages(prev => [...prev, userMsg]);

        try {
            // Save user message
            await fetch(`/api/chats/${chatId}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role: "user", content })
            });

            // Trigger actual chat inference (we need a server action or API for this)
            // For now, let's use the existing chat API which returns a stream
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    prompt: content,
                    repoId: "default", // Should be managed via thread state
                    agentId: "default", // Should be managed via thread state
                    history: messages.map(m => ({ role: m.role, content: m.content }))
                })
            });

            // Handle streaming response
            const reader = response.body?.getReader();
            if (!reader) return;

            let assistantContent = "";
            const assistantMsgId = (Date.now() + 1).toString();
            
            // Add empty assistant message to start streaming into it
            setMessages(prev => [...prev, { id: assistantMsgId, role: "assistant", content: "" }]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = new TextDecoder().decode(value);
                assistantContent += chunk;
                setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: assistantContent } : m));
            }

            // Save assistant message to DB after stream finish
            await fetch(`/api/chats/${chatId}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role: "assistant", content: assistantContent })
            });

        } catch (err) {
            console.error("Failed to send message:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleNewChat = () => {
        setActiveThreadId(undefined);
        setMessages([]);
    };

    const activeThread = threads.find(t => t.id === activeThreadId);

    return (
        <div className="flex h-[calc(100vh-4rem)] bg-background overflow-hidden">
            <div className="w-80 shrink-0 hidden md:block border-r border-border/50">
                <ChatSidebar 
                    threads={threads}
                    activeThreadId={activeThreadId}
                    onThreadSelect={setActiveThreadId}
                    onNewChat={handleNewChat}
                />
            </div>

            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <ChatInterface 
                    messages={messages}
                    isLoading={isLoading}
                    onSendMessage={handleSendMessage}
                    title={activeThread?.title}
                    type={activeThread?.type}
                />
            </div>
        </div>
    );
}
