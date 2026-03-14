"use client";

import React, { useState, useRef, useEffect } from "react";

interface ChatHeaderProps {
    title?: string;
    type?: "web" | "discord";
    agents: { id: string; name: string }[];
    currentAgentId?: string;
    onAgentSelect?: (agentId: string) => void;
    onSetDefaultAgent?: (agentId: string) => void;
    onSetGlobalDefaultAgent?: (agentId: string) => void;
    isLoading: boolean;
}

export default function ChatHeader({
    title,
    type,
    agents,
    currentAgentId,
    onAgentSelect,
    onSetDefaultAgent,
    onSetGlobalDefaultAgent,
    isLoading
}: ChatHeaderProps) {
    const [isAgentMenuOpen, setIsAgentMenuOpen] = useState(false);
    const agentMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (agentMenuRef.current && !agentMenuRef.current.contains(event.target as Node)) {
                setIsAgentMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="border-b border-border/50 backdrop-blur-md bg-background/50 sticky top-0 z-10">
            <div className="max-w-4xl mx-auto p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${isLoading ? "bg-amber-500 animate-pulse" : "bg-green-500"}`} />
                    <h3 className="font-bold text-lg">{title || "Direct Chat"}</h3>
                    {type === "discord" && (
                        <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 text-[10px] font-bold uppercase tracking-wider">
                            Discord
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {agents.length > 0 && (
                        <div className="relative" ref={agentMenuRef}>
                            <button
                                onClick={() => setIsAgentMenuOpen(!isAgentMenuOpen)}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/50 hover:bg-foreground/5 transition-all text-sm font-medium"
                            >
                                <span className="text-foreground/40 text-xs">Agent:</span>
                                <span className="truncate max-w-[120px]">
                                    {agents.find(a => a.id === currentAgentId)?.name || "Select Agent"}
                                </span>
                                <svg className={`w-4 h-4 text-foreground/30 transition-transform ${isAgentMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {isAgentMenuOpen && (
                                <div className="absolute right-0 mt-2 w-64 bg-background border border-border rounded-xl shadow-2xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="p-2 border-b border-border bg-foreground/[0.02]">
                                        <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest px-2">Select Agent</p>
                                    </div>
                                    <div className="max-h-64 overflow-y-auto p-1.5">
                                        {agents.map((agent) => (
                                            <button
                                                key={agent.id}
                                                onClick={() => {
                                                    onAgentSelect?.(agent.id);
                                                    setIsAgentMenuOpen(false);
                                                }}
                                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between group ${
                                                    agent.id === currentAgentId 
                                                        ? "bg-primary/10 text-primary font-semibold" 
                                                        : "hover:bg-foreground/5 text-foreground/70"
                                                }`}
                                            >
                                                <span className="truncate">{agent.name}</span>
                                                {agent.id === currentAgentId && (
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                    {currentAgentId && (
                                        <div className="p-1.5 border-t border-border bg-foreground/[0.01] space-y-1">
                                            {onSetDefaultAgent && (
                                                <button
                                                    onClick={() => {
                                                        onSetDefaultAgent?.(currentAgentId);
                                                        setIsAgentMenuOpen(false);
                                                    }}
                                                    className="w-full text-center px-4 py-2 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary/20 transition-all"
                                                >
                                                    Set for Chat
                                                </button>
                                            )}
                                            {onSetGlobalDefaultAgent && (
                                                <button
                                                    onClick={() => {
                                                        onSetGlobalDefaultAgent?.(currentAgentId);
                                                        setIsAgentMenuOpen(false);
                                                    }}
                                                    className="w-full text-center px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
                                                >
                                                    Set as Global Default
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
