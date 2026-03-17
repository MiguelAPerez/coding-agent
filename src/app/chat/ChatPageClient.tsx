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
    setSelectedRepoId,
    addLoadingChatId,
    removeLoadingChatId
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
    const loadingChatIds = useSelector((state: RootState) => state.chat.loadingChatIds);
    
    const [threads, setThreads] = useState<ChatThread[]>(initialThreads);
    const [activeThreadId, setActiveThreadId] = useState<string | undefined>();
    const [lastLoadedThreadId, setLastLoadedThreadId] = useState<string | undefined>();
    
    // Derived loading state for current chat
    const isCurrentChatLoading = loadingChatIds.includes(activeThreadId || "");

    // Cache for background message updates
    const backgroundMessagesRef = React.useRef<Record<string, Message[]>>({});

    const activeThreadIdRef = React.useRef(activeThreadId);
    useEffect(() => {
        activeThreadIdRef.current = activeThreadId;
    }, [activeThreadId]);

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
        if (activeThreadIdRef.current === chatId) {
            dispatch(addLoadingChatId(chatId));
        }
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
            if (activeThreadIdRef.current === chatId) {
                dispatch(setChatMessages(formattedMessages));
            }
        } catch (err) {
            console.error("Failed to fetch messages:", err);
        } finally {
            dispatch(removeLoadingChatId(chatId));
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
                // Check background cache first
                if (backgroundMessagesRef.current[activeThreadId]) {
                    dispatch(setChatMessages(backgroundMessagesRef.current[activeThreadId]));
                    setLastLoadedThreadId(activeThreadId);
                } else {
                    dispatch(setChatMessages([]));
                    fetchMessages(activeThreadId);
                    setLastLoadedThreadId(activeThreadId);
                }
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
                if (activeThreadIdRef.current === undefined) {
                    activeThreadIdRef.current = newChat.id; // Immediate ref update for isolation gate
                    setActiveThreadId(newChat.id);
                    setLastLoadedThreadId(newChat.id);
                }
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
        if (activeThreadIdRef.current === chatId) {
            dispatch(addLoadingChatId(chatId));
            const userMsg = { id: Date.now().toString(), role: "user" as const, content };
            dispatch(addChatMessage(userMsg));
        }
    
        try {
            const res = await fetch(`/api/chats/${chatId}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role: "user", content })
            });

            if (!res.ok) {
                console.error("Failed to save user message to server", res.status);
                return;
            }

            const assistantMsgId = (Date.now() + 1).toString();
            if (activeThreadIdRef.current === chatId) {
                dispatch(addChatMessage({ id: assistantMsgId, role: "assistant", content: "" }));
            }

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
                
                if (activeThreadIdRef.current === chatId) {
                    dispatch(updateChatMessageById({
                        id: assistantMsgId,
                        content: currentContent.trimStart(),
                        thinking: currentThinking.trimStart()
                    }));
                }

                // Always update background cache
                const currentBackgroundMsgs = backgroundMessagesRef.current[chatId] || [];
                const updatedMsgs = [...currentBackgroundMsgs];
                const msgIdx = updatedMsgs.findIndex(m => m.id === assistantMsgId);
                if (msgIdx !== -1) {
                    updatedMsgs[msgIdx] = { 
                        ...updatedMsgs[msgIdx], 
                        content: currentContent.trimStart(), 
                        thinking: currentThinking.trimStart() 
                    };
                } else {
                    // Try to find if user msg is already there, if not add it
                    const userMsg = { id: (parseInt(assistantMsgId) - 1).toString(), role: "user" as const, content };
                    if (!updatedMsgs.find(m => m.id === userMsg.id)) {
                        updatedMsgs.push(userMsg);
                    }
                    updatedMsgs.push({ 
                        id: assistantMsgId, 
                        role: "assistant", 
                        content: currentContent.trimStart(), 
                        thinking: currentThinking.trimStart() 
                    });
                }
                backgroundMessagesRef.current[chatId] = updatedMsgs;
            });

            await fetch(`/api/chats/${chatId}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role: "assistant", content: assistantContent })
            });

        } catch (err) {
            console.error("Failed to send message:", err);
        } finally {
            dispatch(removeLoadingChatId(chatId));
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
                    isLoading={isCurrentChatLoading}
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
