"use client";

import React, { useRef, useEffect } from "react";
import MessageItem from "./MessageItem";
import { Message } from "./ChatInterface";

interface MessageListProps {
    messages: Message[];
    isLoading: boolean;
}

export default function MessageList({ messages, isLoading }: MessageListProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col scroll-smooth z-0">
            <div className="flex-1" />
            <div className="max-w-4xl mx-auto w-full space-y-6 py-8">
                {messages.length === 0 && !isLoading && (
                    <div className="h-64 flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                        <div className="w-16 h-16 rounded-3xl bg-foreground/5 flex items-center justify-center">
                           <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                           </svg>
                        </div>
                        <p className="text-sm font-medium italic">Start a conversation with your agent.</p>
                    </div>
                )}
                
                {messages.filter(m => m.role !== "system").map((msg) => (
                    <MessageItem key={msg.id} msg={msg} />
                ))}
                
                {isLoading && (
                    (!messages.length || (messages[messages.length - 1].role !== "assistant" || (!messages[messages.length - 1].content && !messages[messages.length - 1].thinking)))
                ) && (
                    <div className="flex justify-start animate-in fade-in duration-500">
                        <div className="bg-foreground/5 border border-border/50 rounded-3xl rounded-tl-sm px-5 py-3 text-sm text-foreground/50 flex items-center gap-3">
                            <div className="flex gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
                            </div>
                            Thinking...
                        </div>
                    </div>
                )}
            </div>
            <div ref={messagesEndRef} />
        </div>
    );
}
