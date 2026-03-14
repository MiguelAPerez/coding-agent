"use client";

import React, { useRef, useEffect } from "react";
import { PendingSuggestion, TechnicalPlan } from "@/app/actions/chat";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { ChatTabs } from "./ChatTabs";

interface ChatPanelProps {
    contextFiles: string[];
    onRemoveContext: (path: string) => void;
    onSendMessage: (message: string) => void;
    pendingSuggestion: PendingSuggestion | null;
    technicalPlan: TechnicalPlan | null;
    onApproveSuggestion: () => void;
    onRejectSuggestion: () => void;
    onApprovePlan: () => void;
    onJumpToFile: (path: string) => void;
    activeTab: "context" | "suggestions" | "plan" | null;
    onTabChange: (tab: "context" | "suggestions" | "plan" | null) => void;
    agents: { id: string, name: string }[];
    selectedAgentId: string;
    onSelectAgent: (id: string) => void;
    messages: { role: string, content: string }[];
    isLoading?: boolean;
    allFiles?: string[];
    onAddContext?: (path: string) => void;
}

export default function ChatPanel({ 
    contextFiles, 
    onRemoveContext, 
    onSendMessage,
    pendingSuggestion,
    technicalPlan,
    onApproveSuggestion,
    onRejectSuggestion,
    onApprovePlan,
    onJumpToFile,
    activeTab,
    onTabChange,
    agents,
    selectedAgentId,
    onSelectAgent,
    messages,
    isLoading = false,
    allFiles = [],
    onAddContext
}: ChatPanelProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    return (
        <div className="flex flex-col h-full bg-background overflow-hidden">
            <div className="p-3 border-b border-border bg-foreground/[0.02] flex items-center justify-between shrink-0">
                <h3 className="font-semibold text-sm">Workspace Copilot</h3>
                <select
                    value={selectedAgentId}
                    onChange={(e) => onSelectAgent(e.target.value)}
                    className="p-1 px-2 text-[10px] bg-foreground/5 border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary w-32"
                >
                    <option value="">Select Agent...</option>
                    {agents.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                </select>
            </div>
            
            <MessageList 
                messages={messages} 
                isLoading={isLoading} 
                messagesEndRef={messagesEndRef} 
            />

            <ChatTabs 
                activeTab={activeTab}
                onTabChange={onTabChange}
                contextFiles={contextFiles}
                onRemoveContext={onRemoveContext}
                pendingSuggestion={pendingSuggestion}
                onApproveSuggestion={onApproveSuggestion}
                onRejectSuggestion={onRejectSuggestion}
                technicalPlan={technicalPlan}
                onApprovePlan={onApprovePlan}
                onJumpToFile={onJumpToFile}
                isLoading={isLoading}
            />
            
            <ChatInput 
                onSendMessage={onSendMessage}
                isLoading={isLoading}
                allFiles={allFiles}
                onAddContext={onAddContext}
            />
        </div>
    );
}
