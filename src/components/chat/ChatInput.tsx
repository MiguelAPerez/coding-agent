"use client";

import React, { useState } from "react";

interface ChatInputProps {
    onSendMessage: (content: string) => void;
    isLoading: boolean;
}

export default function ChatInput({ onSendMessage, isLoading }: ChatInputProps) {
    const [input, setInput] = useState("");

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;
        onSendMessage(input.trim());
        setInput("");
    };

    return (
        <div className="p-4 md:p-8 shrink-0 pb-10 z-10">
            <form 
                onSubmit={handleSubmit} 
                className="max-w-4xl mx-auto relative group"
            >
                <div className="relative flex items-end overflow-hidden rounded-2xl border border-border bg-background shadow-lg focus-within:ring-2 focus-within:ring-primary/20 transition-all">
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
                        className="m-2.5 p-2.5 bg-primary text-white rounded-xl shadow-md disabled:opacity-50 transition-all hover:scale-105 active:scale-95 shrink-0"
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
    );
}
