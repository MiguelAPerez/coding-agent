"use client";

import React, { useState, useEffect, useCallback } from "react";
import { getGitLog } from "@/app/actions/git";

interface GitLogProps {
    repoId: string;
    refreshTrigger?: number;
}

export default function GitLog({ repoId, refreshTrigger }: GitLogProps) {
    const [log, setLog] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);

    const fetchLog = useCallback(async () => {
        if (!repoId) return;
        setIsLoading(true);
        try {
            const res = await getGitLog(repoId);
            if (res.success) {
                setLog(res.log || "No commits found.");
            } else {
                setLog("Error loading git log.");
            }
        } catch (e) {
            console.error("Failed to fetch git log", e);
            setLog("Failed to fetch git log.");
        } finally {
            setIsLoading(false);
        }
    }, [repoId]);

    useEffect(() => {
        fetchLog();
    }, [fetchLog, refreshTrigger]);

    if (!repoId) return null;

    return (
        <div className="flex flex-col h-full bg-background/50 rounded border border-border mt-2 overflow-hidden">
            <div className="flex items-center justify-between px-2 py-1.5 border-b border-border bg-foreground/5">
                <div className="flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground/60">
                        <line x1="6" y1="3" x2="6" y2="15"></line>
                        <circle cx="18" cy="6" r="3"></circle>
                        <circle cx="6" cy="18" r="3"></circle>
                        <path d="M18 9a9 9 0 0 1-9 9"></path>
                    </svg>
                    <span className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wider">Git Tree</span>
                </div>
                <button 
                    onClick={fetchLog}
                    disabled={isLoading}
                    className="p-1 hover:bg-foreground/10 rounded transition-colors disabled:opacity-50"
                    title="Refresh Tree"
                >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`text-foreground/60 ${isLoading ? 'animate-spin' : ''}`}>
                        <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path>
                        <polyline points="21 3 21 8 16 8"></polyline>
                    </svg>
                </button>
            </div>
            <div className="flex-1 overflow-auto p-3 font-mono text-[9px] leading-relaxed whitespace-pre-wrap text-foreground/80 custom-scrollbar selection:bg-primary/30">
                {isLoading && !log ? (
                    <div className="flex items-center justify-center h-full text-foreground/40 italic">
                        Loading tree...
                    </div>
                ) : (
                    log
                )}
            </div>
        </div>
    );
}
