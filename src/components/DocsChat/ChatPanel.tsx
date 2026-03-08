"use client";

import React, { useState } from "react";

export default function ChatPanel() {
    const [messages, setMessages] = useState<{ role: "user" | "agent"; content: string }[]>([
        { role: "agent", content: "Hello! I'm ready to help you explore the document. What would you like to know?" }
    ]);
    const [input, setInput] = useState("");

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        // Add user message
        setMessages(prev => [...prev, { role: "user", content: input }]);
        setInput("");

        // Mock agent response
        setTimeout(() => {
            setMessages(prev => [...prev, { 
                role: "agent", 
                content: "I am analyzing the documentation to answer your question. (This is a mock response)." 
            }]);
        }, 1000);
    };

    return (
        <div className="flex flex-col h-full bg-foreground/[0.01]">
            <div className="p-4 border-b border-border/50 shrink-0 flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    Agent Chat
                </h3>
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
                                    ? "bg-foreground text-background rounded-tr-sm" 
                                    : "bg-foreground/10 rounded-tl-sm"
                            }`}
                        >
                            {msg.content}
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-4 shrink-0 bg-background border-t border-border/50">
                <form onSubmit={handleSendMessage} className="relative flex items-end overflow-hidden rounded-xl border border-border/50 bg-foreground/5 focus-within:ring-1 focus-within:ring-foreground/50 transition-shadow">
                    <textarea 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about this document..."
                        className="w-full bg-transparent p-3 text-sm focus:outline-none resize-none max-h-32 min-h-[44px]"
                        rows={1}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage(e);
                            }
                        }}
                    />
                    <button 
                        type="submit"
                        disabled={!input.trim()}
                        className="p-3 text-foreground/50 hover:text-foreground disabled:opacity-50 transition-colors shrink-0"
                    >
                        {/* Send icon SVG */}
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </form>
            </div>
        </div>
    );
}
