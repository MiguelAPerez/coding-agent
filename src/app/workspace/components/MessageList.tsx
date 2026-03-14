import React from "react";
import { MessageItem } from "./MessageItem";

interface MessageListProps {
    messages: { role: string, content: string }[];
    isLoading?: boolean;
    messagesEndRef: React.RefObject<HTMLDivElement>;
}

export function MessageList({ messages, isLoading, messagesEndRef }: MessageListProps) {
    return (
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
            {messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary font-bold text-xl">
                        AI
                    </div>
                    <p className="text-foreground/70 text-sm max-w-[200px]">
                        Hello! I can help you modify and understand this repository. What would you like to build?
                    </p>
                </div>
            ) : (
                messages.map((m, i) => (
                    <MessageItem key={i} role={m.role} content={m.content} />
                ))
            )}
            {isLoading && (
                <div className="flex flex-col items-start">
                    <div className="max-w-[85%] rounded-2xl px-4 py-2 text-sm bg-foreground/5 border border-border rounded-tl-none flex items-center gap-2">
                        <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"></span>
                        </div>
                        <span className="text-foreground/40 italic text-xs">AI is thinking...</span>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>
    );
}
