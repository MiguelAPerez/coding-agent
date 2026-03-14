"use client";

import React from "react";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";

export interface Message {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    createdAt?: Date;
}

interface ChatInterfaceProps {
    messages: Message[];
    isLoading: boolean;
    onSendMessage: (content: string) => void;
    title?: string;
    type?: "web" | "discord";
    agents?: { id: string; name: string }[];
    currentAgentId?: string;
    onAgentSelect?: (agentId: string) => void;
    onSetDefaultAgent?: (agentId: string) => void;
    onSetGlobalDefaultAgent?: (agentId: string) => void;
}

export default function ChatInterface({ 
    messages, 
    isLoading, 
    onSendMessage, 
    title, 
    type,
    agents = [],
    currentAgentId,
    onAgentSelect,
    onSetDefaultAgent,
    onSetGlobalDefaultAgent
}: ChatInterfaceProps) {
    return (
        <div className="flex flex-col h-full bg-background relative overflow-hidden">
            <ChatHeader 
                title={title}
                type={type}
                agents={agents}
                currentAgentId={currentAgentId}
                onAgentSelect={onAgentSelect}
                onSetDefaultAgent={onSetDefaultAgent}
                onSetGlobalDefaultAgent={onSetGlobalDefaultAgent}
                isLoading={isLoading}
            />

            <MessageList 
                messages={messages}
                isLoading={isLoading}
            />

            <ChatInput 
                onSendMessage={onSendMessage}
                isLoading={isLoading}
            />
        </div>
    );
}
