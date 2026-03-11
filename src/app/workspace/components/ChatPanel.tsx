"use client";

import React, { useState } from "react";
import { PendingSuggestion } from "../WorkspaceClient";

interface ChatPanelProps {
    contextFiles: string[];
    onRemoveContext: (path: string) => void;
    onSendMessage: (message: string) => void;
    pendingSuggestion: PendingSuggestion | null;
    onApproveSuggestion: () => void;
    onRejectSuggestion: () => void;
    onJumpToFile: (path: string) => void;
    activeTab: "context" | "suggestions" | null;
    onTabChange: (tab: "context" | "suggestions" | null) => void;
}

export default function ChatPanel({ 
    contextFiles, 
    onRemoveContext, 
    onSendMessage,
    pendingSuggestion,
    onApproveSuggestion,
    onRejectSuggestion,
    onJumpToFile,
    activeTab,
    onTabChange
}: ChatPanelProps) {
    const [inputValue, setInputValue] = useState("");

    const handleSend = () => {
        if (!inputValue.trim()) return;
        onSendMessage(inputValue);
        setInputValue("");
    };

    return (
        <div className="flex flex-col h-full bg-background">
            <div className="p-3 border-b border-border bg-foreground/[0.02]">
                <h3 className="font-semibold text-sm">Workspace Copilot</h3>
            </div>
            
            {/* Placeholder Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary font-bold text-xl">
                    AI
                </div>
                <p className="text-foreground/70 text-sm max-w-[200px]">
                    Hello! I can help you modify and understand this repository. What would you like to build?
                </p>
            </div>

            {/* Tabbed Context/Suggestions Footer */}
            {(contextFiles.length > 0 || pendingSuggestion) && (
                <div className="border-t border-border flex flex-col bg-foreground/[0.02]">
                    {/* Tab Switcher */}
                    <div className="flex border-b border-border/50">
                        <button 
                            onClick={() => onTabChange(activeTab === "context" ? null : "context")}
                            className={`flex-1 py-1.5 flex items-center justify-center gap-2 transition-colors ${activeTab === 'context' ? 'bg-foreground/5 border-b-2 border-primary text-primary' : 'text-foreground/40 hover:text-foreground/60'}`}
                            title={activeTab === 'context' ? "Collapse Context" : "View Context"}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/></svg>
                            {contextFiles.length > 0 && <span className="text-[10px] bg-foreground/10 px-1 rounded-full text-foreground/60">{contextFiles.length}</span>}
                        </button>
                        <button 
                            onClick={() => onTabChange(activeTab === "suggestions" ? null : "suggestions")}
                            className={`flex-1 py-1.5 flex items-center justify-center gap-2 transition-colors ${activeTab === 'suggestions' ? 'bg-foreground/5 border-b-2 border-blue-500 text-blue-500' : 'text-foreground/40 hover:text-foreground/60'} ${!pendingSuggestion ? 'opacity-30 cursor-not-allowed' : ''}`}
                            disabled={!pendingSuggestion}
                            title={activeTab === 'suggestions' ? "Collapse Suggestions" : "View AI Suggestions"}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4M3 5h4M5 17v4M3 19h4M19 17v4M17 19h4"/></svg>
                            {pendingSuggestion && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>}
                        </button>
                    </div>

                    {activeTab && (
                        <div className="p-3">
                        {activeTab === "context" ? (
                            <div className="flex gap-2 flex-wrap max-h-40 overflow-y-auto">
                                {contextFiles.map(filePath => (
                                    <div 
                                        key={filePath} 
                                        className="group flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-md bg-foreground/5 border border-border/50 hover:border-border transition-colors"
                                        title={filePath}
                                    >
                                        <span className="text-xs text-foreground/80 truncate max-w-[150px]">
                                            {filePath.split("/").pop()}
                                        </span>
                                        <button 
                                            onClick={() => onRemoveContext(filePath)}
                                            className="w-4 h-4 rounded flex items-center justify-center opacity-40 hover:opacity-100 hover:bg-foreground/10 text-xs transition-colors"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                                {contextFiles.length === 0 && (
                                    <div className="text-[11px] text-foreground/30 italic py-2">No files in search context</div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                <div className="max-h-40 overflow-y-auto flex flex-col gap-1 pr-1 custom-scrollbar">
                                    {pendingSuggestion && Object.keys(pendingSuggestion.filesChanged).map(path => (
                                        <button
                                            key={path}
                                            onClick={() => onJumpToFile(path)}
                                            className="text-left px-2 py-1.5 rounded-md hover:bg-foreground/5 transition-colors group flex items-center justify-between gap-3 border border-transparent hover:border-border/50"
                                        >
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <svg className="shrink-0 text-foreground/40" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path>
                                                    <path d="M14 2v4a2 2 0 0 0 2 2h4"></path>
                                                </svg>
                                                <span className="text-xs text-foreground/80 truncate font-medium">{path.split("/").pop()}</span>
                                            </div>
                                            <svg className="shrink-0 text-foreground/20 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                                <polyline points="15 3 21 3 21 9"></polyline>
                                                <line x1="10" y1="14" x2="21" y2="3"></line>
                                            </svg>
                                        </button>
                                    ))}
                                </div>
                                <div className="flex gap-2 border-t border-border/50 pt-2">
                                    <button 
                                        className="flex-1 py-1.5 text-xs font-medium bg-foreground/5 border border-border hover:bg-foreground/10 rounded-md text-foreground transition-colors"
                                        onClick={onRejectSuggestion}
                                    >
                                        Discard
                                    </button>
                                    <button 
                                        className="flex-1 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 rounded-md text-white transition-colors"
                                        onClick={onApproveSuggestion}
                                    >
                                        Apply
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                </div>
            )}
            
            {/* Input area */}
            <div className="p-3 border-t border-border">
                <div className="relative">
                    <input 
                        type="text" 
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder="Ask Copilot..." 
                        className="w-full bg-foreground/5 border border-border rounded-lg pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button 
                        onClick={handleSend}
                        className="absolute right-2 top-1.5 p-1 rounded hover:bg-foreground/10 text-primary"
                    >
                        <span className="text-xs font-bold">↑</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
