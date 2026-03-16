"use client";

import React, { useState, useEffect, useCallback } from "react";
import ChatSidebar, { ChatThread } from "@/components/chat/ChatSidebar";
import ChatInterface, { Message } from "@/components/chat/ChatInterface";

interface ChatPageClientProps {
    initialThreads: ChatThread[];
    initialAgents: { id: string; name: string }[];
}

export default function ChatPageClient({ initialThreads, initialAgents }: ChatPageClientProps) {
    const [threads, setThreads] = useState<ChatThread[]>(initialThreads);
    const [activeThreadId, setActiveThreadId] = useState<string | undefined>();
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [agents] = useState<{ id: string; name: string }[]>(initialAgents);
    const [currentAgentId, setCurrentAgentId] = useState<string | undefined>();
    const [lastLoadedThreadId, setLastLoadedThreadId] = useState<string | undefined>();

    const fetchMessages = useCallback(async (chatId: string) => {
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
    }, []);

    const fetchThreads = useCallback(async () => {
        try {
            const res = await fetch("/api/chats");
            const data = await res.json();
            setThreads(data.map((t: { id: string; title: string; type: "web" | "discord"; agentId?: string; updatedAt: string }) => ({
                id: t.id,
                title: t.title || "Untitled Chat",
                type: t.type,
                agentId: t.agentId,
                updatedAt: new Date(t.updatedAt),
                lastMessage: "Click to view history"
            })));
        } catch (err) {
            console.error("Failed to fetch threads:", err);
        }
    }, []);

    useEffect(() => {
        if (activeThreadId) {
            if (activeThreadId !== lastLoadedThreadId) {
                setMessages([]);
                fetchMessages(activeThreadId);
                setLastLoadedThreadId(activeThreadId);
            }
            
            const thread = threads.find(t => t.id === activeThreadId);
            if (thread) {
                setCurrentAgentId(thread.agentId);
            }
        } else {
            setMessages([]);
            setCurrentAgentId(undefined);
            setLastLoadedThreadId(undefined);
        }
    }, [activeThreadId, threads, fetchMessages, lastLoadedThreadId]);

    const handleSendMessage = async (content: string) => {
        if (!activeThreadId) {
            try {
                const res = await fetch("/api/chats", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        title: content.slice(0, 30),
                        agentId: currentAgentId
                    })
                });
                const newChat = await res.json();
                setActiveThreadId(newChat.id);
                setLastLoadedThreadId(newChat.id);
                await sendMessageToChat(newChat.id, content);
                fetchThreads();
            } catch (err) {
                console.error("Failed to create chat:", err);
            }
            return;
        }

        await sendMessageToChat(activeThreadId, content);
    };

    const sendMessageToChat = async (chatId: string, content: string) => {
        setIsLoading(true);
        const userMsg: Message = { id: Date.now().toString(), role: "user", content };
        setMessages(prev => [...prev, userMsg]);

        try {
            await fetch(`/api/chats/${chatId}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role: "user", content })
            });

            const assistantMsgId = (Date.now() + 1).toString();
            setMessages(prev => [...prev, { id: assistantMsgId, role: "assistant", content: "" }]);

            const { streamChatResponse } = await import("@/lib/chat/client-utils");
            const assistantContent = await streamChatResponse({
                prompt: content,
                repoId: null,
                agentId: currentAgentId || "default",
                history: messages.map(m => ({ role: m.role, content: m.content }))
            }, (chunk) => {
                setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: m.content + chunk } : m));
            });

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
        setCurrentAgentId(undefined);
    };

    const handleSetDefaultAgent = async (agentId: string) => {
        if (!activeThreadId) return;
        try {
            await fetch(`/api/chats/${activeThreadId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ agentId })
            });
            fetchThreads();
        } catch (err) {
            console.error("Failed to set default agent:", err);
        }
    };

    const handleDeleteChat = async (id: string) => {
        try {
            await fetch(`/api/chats/${id}`, {
                method: "DELETE"
            });
            if (activeThreadId === id) {
                setActiveThreadId(undefined);
                setMessages([]);
                setCurrentAgentId(undefined);
            }
            fetchThreads();
        } catch (err) {
            console.error("Failed to delete chat:", err);
        }
    };

    const activeThread = threads.find(t => t.id === activeThreadId);

    return (
        <div className="flex h-[calc(100vh-4rem)] bg-background overflow-hidden">
            <div className="w-80 shrink-0 hidden md:block border-r border-border/50">
                <ChatSidebar
                    threads={threads}
                    activeThreadId={activeThreadId}
                    onThreadSelect={setActiveThreadId}
                    onThreadDelete={handleDeleteChat}
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
                    agents={agents}
                    currentAgentId={currentAgentId}
                    onAgentSelect={setCurrentAgentId}
                    onSetDefaultAgent={handleSetDefaultAgent}
                />
            </div>
        </div>
    );
}
