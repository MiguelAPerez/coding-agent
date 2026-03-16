"use client";

import React, { useState } from "react";

interface ChatInputProps {
    onSendMessage: (content: string) => void;
    isLoading: boolean;
    repositories?: { id: string; fullName: string }[];
    selectedRepoId?: string;
    onRepoSelect?: (repoId: string | undefined) => void;
}

export default function ChatInput({ 
    onSendMessage, 
    isLoading,
    repositories = [],
    selectedRepoId,
    onRepoSelect
}: ChatInputProps) {
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
                {repositories.length > 0 && (
                    <div className="mb-4 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-1 duration-500">
                        <div className="relative group/repo">
                            <select
                                value={selectedRepoId || ""}
                                onChange={(e) => onRepoSelect?.(e.target.value || undefined)}
                                className="appearance-none bg-foreground/5 border border-border/50 hover:border-border transition-all rounded-full py-1.5 pl-8 pr-8 text-[10px] font-bold uppercase tracking-wider text-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/30 min-w-[120px] cursor-pointer"
                            >
                                <option value="">Global Context</option>
                                {repositories.map(repo => (
                                    <option key={repo.id} value={repo.id}>
                                        {repo.fullName.split('/').pop()}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                                <svg className={`w-3.5 h-3.5 ${selectedRepoId ? "text-primary" : "text-foreground/40"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                </svg>
                            </div>
                            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                        {selectedRepoId && (
                            <span className="text-[10px] font-medium text-primary/70 animate-in fade-in zoom-in duration-300">
                                Repository Scope Enabled
                            </span>
                        )}
                    </div>
                )}
                <div className="relative flex items-end overflow-hidden rounded-2xl border border-border bg-background shadow-lg focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                    <textarea 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={selectedRepoId ? "Search in this repository..." : "Type your message..."}
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
