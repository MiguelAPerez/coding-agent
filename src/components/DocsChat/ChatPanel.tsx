"use client";

import React, { useState } from "react";
import { Repository } from "./DocsSidebar";
import { AgentConfig } from "@/types/agent";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

interface ChatPanelProps {
    repo: Repository;
    filePath: string | null;
    onSelectFile: (path: string) => void;
    agents: AgentConfig[];
}

export default function ChatPanel({ repo, filePath, onSelectFile, agents }: ChatPanelProps) {
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(agents[0]?.id || null);
    const [messages, setMessages] = useState<{ role: "user" | "agent"; content: string; thinking?: string }[]>([
        { role: "agent", content: "Hello! I'm ready to help you explore the document. What would you like to know?" }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setMessages(prev => [...prev, { role: "user", content: userMessage }]);
        setInput("");
        setIsLoading(true);

        try {
            const { streamChatResponse } = await import("@/lib/chat/client-utils");
            
            setMessages(prev => [...prev, { role: "agent", content: "" }]);
            const assistantMsgIndex = messages.length + 1;

            let fullStreamingContent = "";
            const assistantContent = await streamChatResponse({
                prompt: userMessage,
                repoId: repo.id,
                filePath: filePath,
                agentId: selectedAgentId || "default",
                workMode: "DOCUMENTATION",
                history: messages.map(m => ({ role: m.role === "agent" ? "assistant" : "user", content: m.content }))
            }, (chunk) => {
                fullStreamingContent += chunk;
                
                let currentThinking = "";
                let currentContent = fullStreamingContent;
                
                const thinkStart = fullStreamingContent.indexOf("<think>");
                const thinkEnd = fullStreamingContent.indexOf("</think>");
                
                if (thinkStart !== -1) {
                    if (thinkEnd !== -1) {
                        currentThinking = fullStreamingContent.substring(thinkStart + 7, thinkEnd);
                        currentContent = fullStreamingContent.substring(0, thinkStart) + fullStreamingContent.substring(thinkEnd + 8);
                    } else {
                        currentThinking = fullStreamingContent.substring(thinkStart + 7);
                        currentContent = fullStreamingContent.substring(0, thinkStart);
                    }
                }

                setMessages(prev => {
                    const next = [...prev];
                    next[assistantMsgIndex] = { 
                        role: "agent", 
                        content: currentContent.trimStart(),
                        thinking: currentThinking.trimStart() 
                    };
                    return next;
                });
            });

            // After streaming, check for navigation suggestions in the final content
            const jsonMatch = assistantContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (parsed.redirect) {
                        onSelectFile(parsed.redirect);
                    }
                } catch { /* ignore */ }
            }

        } catch (err) {
            console.error("Chat error:", err);
            setMessages(prev => [...prev, { 
                role: "agent", 
                content: `Error: ${err instanceof Error ? err.message : "Failed to get response from agent."}` 
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-foreground/[0.01]">
            <div className="p-4 border-b border-border/50 shrink-0 flex items-center justify-between gap-4">
                <h3 className="font-semibold flex items-center gap-2 whitespace-nowrap">
                    <span className={`w-2 h-2 rounded-full ${isLoading ? "bg-amber-500 animate-pulse" : "bg-green-500"}`}></span>
                    Agent Chat
                </h3>
                <select
                    value={selectedAgentId || ""}
                    onChange={(e) => setSelectedAgentId(e.target.value)}
                    className="text-xs bg-foreground/5 border border-border/50 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-foreground/20 max-w-[150px] truncate"
                >
                    {agents.map(agent => (
                        <option key={agent.id} value={agent.id}>{agent.name}</option>
                    ))}
                    {agents.length === 0 && <option value="">No Agents</option>}
                </select>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, i) => (
                    <div 
                        key={i} 
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                        <div 
                            className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                                msg.role === "user" 
                                    ? "bg-foreground text-background rounded-tr-sm whitespace-pre-wrap" 
                                    : "bg-foreground/10 rounded-tl-sm"
                            }`}
                        >
                            {msg.role === "agent" ? (
                                <>
                                    {msg.thinking && (
                                        <div className="mb-3 pb-3 border-b border-border/20 text-[11px] text-foreground/50 italic whitespace-pre-wrap">
                                            <div className="flex items-center gap-1.5 mb-1 not-italic font-semibold opacity-70">
                                                <div className="w-1 h-1 rounded-full bg-primary/40 animate-pulse" />
                                                Thought
                                            </div>
                                            {msg.thinking}
                                        </div>
                                    )}
                                    <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0 prose-code:text-foreground prose-code:bg-foreground/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
                                        <ReactMarkdown 
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                code(props: { inline?: boolean; className?: string; children?: React.ReactNode }) {
                                                    const { inline, className, children } = props;
                                                    const match = /language-(\w+)/.exec(className || '');
                                                    return !inline && match ? (
                                                        <div className="my-2 rounded-lg overflow-hidden border border-border/50 shadow-sm">
                                                            <SyntaxHighlighter
                                                                style={vscDarkPlus as { [key: string]: React.CSSProperties }}
                                                                language={match[1]}
                                                                PreTag="div"
                                                                customStyle={{ margin: 0, padding: '1rem', fontSize: '11px' }}
                                                            >
                                                                {String(children).replace(/\n$/, '')}
                                                            </SyntaxHighlighter>
                                                        </div>
                                                    ) : (
                                                        <code className={className}>
                                                            {children}
                                                        </code>
                                                    );
                                                }
                                            }}
                                        >
                                            {msg.content}
                                        </ReactMarkdown>
                                    </div>
                                </>
                            ) : (
                                msg.content
                            )}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-foreground/10 rounded-2xl rounded-tl-sm px-4 py-2 text-sm text-foreground/50 animate-pulse">
                            Thinking...
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 shrink-0 bg-background border-t border-border/50">
                <form onSubmit={handleSendMessage} className="relative flex items-end overflow-hidden rounded-xl border border-border/50 bg-foreground/5 focus-within:ring-1 focus-within:ring-foreground/50 transition-shadow">
                    <textarea 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about this document..."
                        className="w-full bg-transparent p-3 text-sm focus:outline-none resize-none max-h-32 min-h-[44px]"
                        rows={1}
                        disabled={isLoading}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage(e);
                            }
                        }}
                    />
                    <button 
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="p-3 text-foreground/50 hover:text-foreground disabled:opacity-50 transition-colors shrink-0"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </form>
            </div>
        </div>
    );
}
