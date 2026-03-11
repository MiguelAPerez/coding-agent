"use client";

import React from "react";

interface ChatPanelProps {
    changedFiles: { path: string, status: string }[];
}

export default function ChatPanel({ changedFiles }: ChatPanelProps) {
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

            {/* Changed Files Footer Area */}
            {changedFiles.length > 0 && (
                <div className="border-t border-border p-3 bg-foreground/[0.02]">
                    <h4 className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-2">Local Changes</h4>
                    <div className="flex gap-2 flex-wrap max-h-32 overflow-y-auto">
                        {changedFiles.map(file => (
                            <div 
                                key={file.path} 
                                className="flex items-center gap-1.5 px-2 py-1 rounded bg-foreground/5"
                                title={file.path}
                            >
                                <span className={`text-xs font-bold leading-none w-3 text-center
                                    ${file.status.includes('M') ? 'text-blue-500' : 'text-green-500'}
                                `}>
                                    {file.status.trim().charAt(0)}
                                </span>
                                <span className="text-xs text-foreground/80 truncate max-w-[120px]">
                                    {file.path.split("/").pop()}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Input area */}
            <div className="p-3 border-t border-border">
                <div className="relative">
                    <input 
                        type="text" 
                        placeholder="Ask Copilot..." 
                        className="w-full bg-foreground/5 border border-border rounded-lg pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button className="absolute right-2 top-1.5 p-1 rounded hover:bg-foreground/10 text-primary">
                        <span className="text-xs font-bold">↑</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
