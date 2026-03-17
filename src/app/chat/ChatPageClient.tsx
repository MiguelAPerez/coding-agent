"use client";

import React, { useState, useEffect, useCallback } from "react";
import ChatSidebar, { ChatThread } from "@/components/chat/ChatSidebar";
import ChatInterface, { Message } from "@/components/chat/ChatInterface";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/lib/store/store";
import { 
    setChatMessages, 
    addChatMessage, 
    updateChatMessageById, 
    setAgents, 
    setSelectedAgentId,
    setRepositories,
    setSelectedRepoId
} from "@/lib/store/features/chat/chatSlice";

interface ChatPageClientProps {
    initialThreads: ChatThread[];
    initialAgents: { id: string; name: string }[];
    defaultAgentId?: string;
}

export default function ChatPageClient({ initialThreads, initialAgents, defaultAgentId }: ChatPageClientProps) {
    const dispatch = useDispatch();
    const messages = useSelector((state: RootState) => state.chat.chatMessages);
    const repositories = useSelector((state: RootState) => state.chat.repositories);
    const selectedRepoId = useSelector((state: RootState) => state.chat.selectedRepoId);
    const agents = useSelector((state: RootState) => state.chat.agents);
    const selectedAgentId = useSelector((state: RootState) => state.chat.selectedAgentId);

    const [threads, setThreads] = useState<ChatThread[]>(initialThreads);
    const [activeThreadId, setActiveThreadId] = useState<string | undefined>();
    const [isLoading, setIsLoading] = useState(false);
    const [lastLoadedThreadId, setLastLoadedThreadId] = useState<string | undefined>();

    useEffect(() => {
        dispatch(setAgents(initialAgents));
    }, [initialAgents, dispatch]);

    useEffect(() => {
        const fetchRepos = async () => {
            try {
                const res = await fetch("/api/repositories");
                const data = await res.json();
                dispatch(setRepositories(data.map((r: { id: string; fullName: string }) => ({ id: r.id, fullName: r.fullName }))));
            } catch (err) {
                console.error("Failed to fetch repositories:", err);
            }
        };
        fetchRepos();
    }, [dispatch]);

    const fetchMessages = useCallback(async (chatId: string) => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/chats/${chatId}/messages`);
            const data = await res.json();
            const formattedMessages = data.map((m: { id: string; role: "user" | "assistant" | "system"; content: string; createdAt: string }) => {
                let thinking = "";
                let content = m.content;
                
                const thinkStart = m.content.indexOf("<think>");
                const thinkEnd = m.content.indexOf("</think>");
                
                if (thinkStart !== -1) {
                    if (thinkEnd !== -1) {
                        thinking = m.content.substring(thinkStart + 7, thinkEnd);
                        content = m.content.substring(0, thinkStart) + m.content.substring(thinkEnd + 8);
                    } else {
                        thinking = m.content.substring(thinkStart + 7);
                        content = m.content.substring(0, thinkStart);
                    }
                }

                return {
                    id: m.id,
                    role: m.role,
                    content: content.trimStart(),
                    thinking: thinking.trimStart(),
                    createdAt: new Date(m.createdAt)
                };
            });
            dispatch(setChatMessages(formattedMessages));
        } catch (err) {
            console.error("Failed to fetch messages:", err);
        } finally {
            setIsLoading(false);
        }
    }, [dispatch]);

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
                dispatch(setChatMessages([]));
                fetchMessages(activeThreadId);
                setLastLoadedThreadId(activeThreadId);
            }
            
            const thread = threads.find(t => t.id === activeThreadId);
            if (thread && thread.agentId) {
                dispatch(setSelectedAgentId(thread.agentId));
            }
        } else {
            dispatch(setChatMessages([]));
            // Initialize with default agent if available
            dispatch(setSelectedAgentId(defaultAgentId || ""));
            setLastLoadedThreadId(undefined);
        }
    }, [activeThreadId, threads, fetchMessages, lastLoadedThreadId, dispatch, defaultAgentId]);

    const handleSendMessage = async (content: string) => {
        if (!activeThreadId) {
            try {
                const res = await fetch("/api/chats", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        title: content.slice(0, 30),
                        agentId: selectedAgentId
                    })
                });
                if (!res.ok) {
                    throw new Error(`Failed to create chat: ${res.statusText}`);
                }
                const newChat = await res.json();
                if (!newChat.id) {
                    throw new Error("Failed to create chat: No ID returned");
                }
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
        if (!chatId || chatId === "undefined") {
            console.error("Aborting sendMessageToChat: invalid chatId", chatId);
            return;
        }
        setIsLoading(true);
        const userMsg = { id: Date.now().toString(), role: "user" as const, content };
        dispatch(addChatMessage(userMsg));

        try {
            await fetch(`/api/chats/${chatId}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role: "user", content })
            });

            const assistantMsgId = (Date.now() + 1).toString();
            dispatch(addChatMessage({ id: assistantMsgId, role: "assistant", content: "" }));

            const { streamChatResponse } = await import("@/lib/chat/client-utils");
            let fullStreamingContent = "";
            const assistantContent = await streamChatResponse({
                prompt: content,
                repoId: selectedRepoId || undefined,
                agentId: selectedAgentId || "default",
                history: [
                    ...messages.map(m => ({ role: m.role, content: m.content })),
                    { role: "user", content }
                ]
            }, (chunk) => {
                fullStreamingContent += chunk;
                
                let currentThinking = "";
                let currentContent = fullStreamingContent;
                
                // Extract all closed <think>...</think> blocks
                const thinkRegex = /<think>([\s\S]*?)<\/think>/g;
                let match;
                while ((match = thinkRegex.exec(fullStreamingContent)) !== null) {
                    currentThinking += match[1] + "\n\n";
                }
                
                // Also handle the trailing open <think> block if it exists
                const lastThinkIndex = fullStreamingContent.lastIndexOf("<think>");
                const lastThinkEndIndex = fullStreamingContent.lastIndexOf("</think>");
                
                if (lastThinkIndex !== -1 && lastThinkIndex > lastThinkEndIndex) {
                    currentThinking += fullStreamingContent.substring(lastThinkIndex + 7);
                    currentContent = fullStreamingContent.substring(0, lastThinkIndex);
                }
                
                // Remove all closed <think> blocks from content
                currentContent = currentContent.replace(thinkRegex, "");

                // Strip JSON tool calls from thinking to keep it clean
                const jsonToolCallRegex = /```json\s*\{\s*"skill":[\s\S]*?\}\s*```/g;
                currentThinking = currentThinking.replace(jsonToolCallRegex, "");
                
                dispatch(updateChatMessageById({
                    id: assistantMsgId,
                    content: currentContent.trimStart(),
                    thinking: currentThinking.trimStart()
                }));
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
        dispatch(setChatMessages([]));
        // Don't reset selectedAgentId here to avoid breaking new chat creation
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

    const handleSetGlobalDefaultAgent = async (agentId: string) => {
        try {
            const { setDefaultAgentAction } = await import("@/app/actions/default-agent");
            await setDefaultAgentAction(agentId, "chat");
            // Optionally notify user or update local state if needed
        } catch (err) {
            console.error("Failed to set global default agent:", err);
        }
    };

    const handleDeleteChat = async (id: string) => {
        try {
            await fetch(`/api/chats/${id}`, {
                method: "DELETE"
            });
            if (activeThreadId === id) {
                setActiveThreadId(undefined);
                dispatch(setChatMessages([]));
                dispatch(setSelectedAgentId(""));
            }
            fetchThreads();
        } catch (err) {
            console.error("Failed to delete chat:", err);
        }
    };

    const handleClearAll = async () => {
        try {
            const { deleteAllChats } = await import("@/app/actions/chat");
            await deleteAllChats();
            setThreads([]);
            setActiveThreadId(undefined);
            dispatch(setChatMessages([]));
            dispatch(setSelectedAgentId(defaultAgentId || ""));
        } catch (err) {
            console.error("Failed to clear all chats:", err);
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
                    onClearAll={handleClearAll}
                    onNewChat={handleNewChat}
                />
            </div>

            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <ChatInterface
                    messages={messages as Message[]}
                    isLoading={isLoading}
                    onSendMessage={handleSendMessage}
                    title={activeThread?.title}
                    type={activeThread?.type}
                    agents={agents}
                    currentAgentId={selectedAgentId}
                    onAgentSelect={(id) => dispatch(setSelectedAgentId(id))}
                    onSetDefaultAgent={handleSetDefaultAgent}
                    onSetGlobalDefaultAgent={handleSetGlobalDefaultAgent}
                    repositories={repositories}
                    selectedRepoId={selectedRepoId || undefined}
                    onRepoSelect={(id) => dispatch(setSelectedRepoId(id || null))}
                />
            </div>
        </div>
    );
}
