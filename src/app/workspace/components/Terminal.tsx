"use client";

import React, { useState, useRef, useEffect } from "react";

interface LogEntry {
    type: "input" | "stdout" | "stderr" | "info";
    content: string;
    timestamp: number;
}

interface TerminalProps {
    logs: LogEntry[];
    onExecute: (command: string) => void;
    isSandboxConnected: boolean;
    sandboxName?: string;
    isFollowMode: boolean;
    onToggleFollow: () => void;
    onClearLogs: () => void;
}

export default function Terminal({
    logs,
    onExecute,
    isSandboxConnected,
    sandboxName,
    isFollowMode,
    onToggleFollow,
    onClearLogs
}: TerminalProps) {
    const [inputValue, setInputValue] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when logs change
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && inputValue.trim()) {
            onExecute(inputValue.trim());
            setInputValue("");
        }
        if ((e.metaKey || e.ctrlKey) && e.key === "k") {
            e.preventDefault();
            onClearLogs();
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#0d0d0d] text-[#e0e0e0] font-mono text-xs overflow-hidden border-t border-border/50">
            {/* Terminal Header */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-foreground/[0.03] border-b border-border/20">
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/30">Terminal</span>
                    <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${isSandboxConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`} />
                        <span className="text-[10px] text-foreground/40">
                            {isSandboxConnected ? `Connected: ${sandboxName}` : 'Disconnected'}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onToggleFollow}
                        className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tighter transition-all ${
                            isFollowMode 
                            ? 'bg-primary/20 text-primary border border-primary/30 shadow-[0_0_8px_rgba(var(--primary),0.2)]' 
                            : 'bg-foreground/5 text-foreground/30 border border-transparent hover:bg-foreground/10 hover:text-foreground/50'
                        }`}
                        title="Follow AI commands in real-time"
                    >
                        {isFollowMode ? 'FOLLOWING BOT' : 'FOLLOW BOT'}
                    </button>
                    <div className="flex gap-1.5 ml-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-foreground/10" />
                        <div className="w-2.5 h-2.5 rounded-full bg-foreground/10" />
                    </div>
                </div>
            </div>

            {/* Logs Area */}
            <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-3 custom-scrollbar space-y-1 selection:bg-primary/30"
            >
                {logs.length === 0 ? (
                    <div className="text-foreground/20 italic">No output. Commands executed by you or the AI will appear here.</div>
                ) : (
                    logs.map((log, i) => (
                        <div key={i} className="flex gap-2 break-all animate-in fade-in duration-300">
                            {log.type === "input" && <span className="text-primary shrink-0">$</span>}
                            {log.type === "stderr" && <span className="text-red-400 shrink-0">!</span>}
                            {log.type === "info" && <span className="text-blue-400 shrink-0">i</span>}
                            <span className={`
                                whitespace-pre-wrap
                                ${log.type === "input" ? "text-foreground font-bold" : ""}
                                ${log.type === "stderr" ? "text-red-400/90" : ""}
                                ${log.type === "info" ? "text-blue-400/80 italic" : ""}
                                ${log.type === "stdout" ? "text-foreground/80" : ""}
                            `}>
                                {log.content}
                            </span>
                        </div>
                    ))
                )}
            </div>

            {/* Input Line */}
            <div className="p-3 bg-foreground/[0.02] flex items-center gap-2 border-t border-border/10">
                <span className="text-primary font-bold shrink-0">❯</span>
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={!isSandboxConnected}
                    placeholder={isSandboxConnected ? "Type a command..." : "Select a repository with an active sandbox to run commands"}
                    className="flex-1 bg-transparent outline-none text-foreground/90 disabled:opacity-30 disabled:cursor-not-allowed"
                />
            </div>
        </div>
    );
}
