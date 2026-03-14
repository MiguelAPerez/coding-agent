"use client";

import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

export interface Message {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    createdAt?: Date;
}

interface ChatInterfaceProps {
    messages: Message[];
    isLoading: boolean;
    onSendMessage: (content: string) => void;
    title?: string;
    type?: "web" | "discord";
}

export default function ChatInterface({ messages, isLoading, onSendMessage, title, type }: ChatInterfaceProps) {
    const [input, setInput] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;
        onSendMessage(input.trim());
        setInput("");
    };

    return (
        <div className="flex flex-col h-full bg-background relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] rounded-full bg-purple-500/5 blur-[100px] pointer-events-none" />

            {/* Header */}
            <div className="p-4 border-b border-border/50 backdrop-blur-md bg-background/50 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${isLoading ? "bg-amber-500 animate-pulse" : "bg-green-500"}`} />
                    <h3 className="font-bold text-lg">{title || "Direct Chat"}</h3>
                    {type === "discord" && (
                        <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 text-[10px] font-bold uppercase tracking-wider">
                            Discord
                        </span>
                    )}
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scroll-smooth z-0">
                {messages.length === 0 && !isLoading && (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                        <div className="w-16 h-16 rounded-3xl bg-foreground/5 flex items-center justify-center">
                           <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                           </svg>
                        </div>
                        <p className="text-sm font-medium italic">Start a conversation with your agent.</p>
                    </div>
                )}
                
                {messages.filter(m => m.role !== "system").map((msg) => (
                    <div 
                        key={msg.id} 
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                    >
                        <div 
                            className={`group relative max-w-[85%] md:max-w-[75%] rounded-3xl px-5 py-3 text-sm shadow-sm transition-all ${
                                msg.role === "user" 
                                    ? "bg-foreground text-background rounded-tr-sm" 
                                    : "glass border border-border/50 rounded-tl-sm ring-1 ring-white/10"
                            }`}
                        >
                            {msg.role === "assistant" ? (
                                <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed prose-p:my-1 prose-pre:my-2 prose-headings:my-2 prose-ul:my-1 prose-li:my-0 prose-code:text-foreground prose-code:bg-foreground/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
                                    <ReactMarkdown 
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            code(props: { inline?: boolean; className?: string; children?: React.ReactNode }) {
                                                const { inline, className, children } = props;
                                                const match = /language-(\w+)/.exec(className || '');
                                                return !inline && match ? (
                                                    <div className="my-3 rounded-xl overflow-hidden border border-border/50 shadow-2xl">
                                                        <div className="bg-foreground/5 px-4 py-1.5 border-b border-border/50 flex items-center justify-between">
                                                            <span className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">{match[1]}</span>
                                                            <div className="flex gap-1.5">
                                                                <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
                                                                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20" />
                                                                <div className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
                                                            </div>
                                                        </div>
                                                        <SyntaxHighlighter
                                                            style={vscDarkPlus as { [key: string]: React.CSSProperties }}
                                                            language={match[1]}
                                                            PreTag="div"
                                                            customStyle={{ margin: 0, padding: '1.25rem', fontSize: '12px', background: 'transparent' }}
                                                        >
                                                            {String(children).replace(/\n$/, '')}
                                                        </SyntaxHighlighter>
                                                    </div>
                                                ) : (
                                                    <code className={`${className} bg-foreground/10 px-1.5 py-0.5 rounded font-mono text-xs`}>
                                                        {children}
                                                    </code>
                                                );
                                            }
                                        }}
                                    >
                                        {msg.content}
                                    </ReactMarkdown>
                                </div>
                            ) : (
                                <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                            )}
                        </div>
                    </div>
                ))}
                
                {isLoading && (
                    <div className="flex justify-start animate-in fade-in duration-500">
                        <div className="glass border border-border/50 rounded-3xl rounded-tl-sm px-5 py-3 text-sm text-foreground/50 flex items-center gap-3">
                            <div className="flex gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
                            </div>
                            Thinking...
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 md:p-8 shrink-0 bg-gradient-to-t from-background via-background to-transparent pt-12 z-10">
                <form 
                    onSubmit={handleSubmit} 
                    className="max-w-4xl mx-auto relative group"
                >
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-purple-600 rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition-opacity duration-500" />
                    <div className="relative flex items-end overflow-hidden rounded-2xl border border-border/50 bg-background shadow-2xl focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                        <textarea 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Type your message..."
                            className="flex-1 bg-transparent p-4 text-sm focus:outline-none resize-none max-h-48 min-h-[56px] placeholder:text-foreground/30"
                            rows={1}
                            disabled={isLoading}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit();
                                }
                            }}
                        />
                        <button 
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="m-2 p-3 bg-primary text-white rounded-xl shadow-lg shadow-primary/30 disabled:opacity-50 disabled:shadow-none transition-all hover:scale-105 active:scale-95 shrink-0"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    </div>
                </form>
                <p className="mt-3 text-[10px] text-center text-foreground/30 font-medium tracking-wide uppercase">
                    Your conversation is encrypted and saved to history.
                </p>
            </div>
        </div>
    );
}
