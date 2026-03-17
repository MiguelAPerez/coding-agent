"use client";

import React from "react";
import { formatDistanceToNow } from "date-fns";

export interface ChatThread {
    id: string;
    title: string;
    type: "web" | "discord";
    updatedAt: Date;
    agentId?: string;
    lastMessage?: string;
}

interface ChatSidebarProps {
    threads: ChatThread[];
    activeThreadId?: string;
    onThreadSelect: (id: string) => void;
    onThreadDelete: (id: string) => void;
    onClearAll: () => void;
    onNewChat: () => void;
}

export default function ChatSidebar({ threads, activeThreadId, onThreadSelect, onThreadDelete, onClearAll, onNewChat }: ChatSidebarProps) {
    return (
        <div className="flex flex-col h-full bg-foreground/[0.02] border-r border-border/50">
            <div className="p-4 border-b border-border/50">
                <button 
                    onClick={onNewChat}
                    className="w-full py-2.5 px-4 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Chat
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {threads.map((thread) => (
                    <div
                        key={thread.id}
                        onClick={() => onThreadSelect(thread.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                onThreadSelect(thread.id);
                            }
                        }}
                        className={`w-full text-left p-3 rounded-xl transition-all group cursor-pointer ${
                            activeThreadId === thread.id 
                                ? "bg-foreground/10 ring-1 ring-foreground/20 shadow-sm" 
                                : "hover:bg-foreground/5"
                        }`}
                    >
                        <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${
                                thread.type === "discord" ? "bg-indigo-500/10 text-indigo-500" : "bg-primary/10 text-primary"
                            }`}>
                                {thread.type === "discord" ? (
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.419 0 1.334-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.419 0 1.334-.946 2.419-2.157 2.419z"/>
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                    </svg>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-0.5">
                                    <h4 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                                        {thread.title}
                                    </h4>
                                    <span className="text-[10px] text-foreground/40 whitespace-nowrap">
                                        {formatDistanceToNow(thread.updatedAt, { addSuffix: false })}
                                    </span>
                                </div>
                                <p className="text-xs text-foreground/50 truncate">
                                    {thread.lastMessage || "No messages yet"}
                                </p>
                            </div>
                            
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm("Are you sure you want to delete this conversation?")) {
                                        onThreadDelete(thread.id);
                                    }
                                }}
                                className="opacity-0 group-hover:opacity-100 p-2 text-foreground/30 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                title="Delete Chat"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    </div>
                ))}
                {threads.length === 0 && (
                    <div className="p-4 text-center text-sm text-foreground/40 italic">
                        No conversations yet.
                    </div>
                )}
            </div>

            {threads.length > 0 && (
                <div className="p-4 border-t border-border/50">
                    <button
                        onClick={() => {
                            if (confirm("Are you sure you want to delete ALL conversations? This cannot be undone.")) {
                                onClearAll();
                            }
                        }}
                        className="w-full py-2 px-4 text-red-500 hover:bg-red-500/10 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 group"
                    >
                        <svg className="w-4 h-4 opacity-50 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Clear All Conversations
                    </button>
                </div>
            )}
        </div>
    );
}
