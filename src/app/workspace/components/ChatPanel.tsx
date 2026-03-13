"use client";

import React, { useState } from "react";
import { PendingSuggestion } from "@/app/actions/chat";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

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
    onApproveSuggestion,
    onRejectSuggestion,
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
    const [inputValue, setInputValue] = useState("");
    const [showMentions, setShowMentions] = useState(false);
    const [mentionQuery, setMentionQuery] = useState("");
    const [mentionStartIndex, setMentionStartIndex] = useState(-1);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = React.useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    React.useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Auto-resize textarea
    React.useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    }, [inputValue]);

    const handleSend = () => {
        if (!inputValue.trim() || isLoading) return;
        onSendMessage(inputValue);
        setInputValue("");
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        const cursorPosition = e.target.selectionStart;
        setInputValue(value);

        // Simple mention detection
        const lastAtIndex = value.lastIndexOf('@', cursorPosition - 1);
        if (lastAtIndex !== -1) {
            const textAfterAt = value.substring(lastAtIndex + 1, cursorPosition);
            const charBeforeAt = lastAtIndex > 0 ? value[lastAtIndex - 1] : ' ';
            // Relaxed trigger: space, newline, or common punctuation/openers
            const isWordBoundary = /[\s\n\(\[\{\,\;]/.test(charBeforeAt);
            if (isWordBoundary && !textAfterAt.includes(' ')) {
                setShowMentions(true);
                setMentionQuery(textAfterAt.toLowerCase());
                setMentionStartIndex(lastAtIndex);
            } else {
                setShowMentions(false);
            }
        } else {
            setShowMentions(false);
        }
    };

    const selectMention = (file: string) => {
        if (!onAddContext) return;
        
        const before = inputValue.substring(0, mentionStartIndex);
        const after = inputValue.substring(textareaRef.current?.selectionStart || 0);
        
        // Use the full relative path so the model knows the directory
        setInputValue(`${before}@${file}${after}`);
        onAddContext(file);
        setShowMentions(false);
        textareaRef.current?.focus();
    };

    const filteredFiles = allFiles
        .filter(f => f.toLowerCase().includes(mentionQuery))
        .slice(0, 10);

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
            
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
                {messages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary font-bold text-xl">
                            AI
                        </div>
                        <p className="text-foreground/70 text-sm max-w-[200px]">
                            Hello! I can help you modify and understand this repository. What would you like to build?
                        </p>
                    </div>
                ) : (
                    messages.map((m, i) => (
                        <div 
                            key={i} 
                            className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                        >
                            <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                                m.role === 'user' 
                                ? 'bg-primary text-primary-foreground rounded-tr-none' 
                                : 'bg-foreground/5 border border-border rounded-tl-none'
                            }`}>
                                {m.role === 'assistant' ? (
                                    <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0 prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
                                        <ReactMarkdown 
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                code(props: { inline?: boolean; className?: string; children?: React.ReactNode }) {
                                                    const { inline, className, children } = props;
                                                    const match = /language-(\w+)/.exec(className || '');
                                                    return !inline && match ? (
                                                        <div className="my-2 rounded-lg overflow-hidden border border-border/50 shadow-sm">
                                                            <SyntaxHighlighter
                                                                style={vscDarkPlus as { [key: string]: React.CSSProperties }}
                                                                language={match[1]}
                                                                PreTag="div"
                                                                customStyle={{ margin: 0, padding: '1rem', fontSize: '11px' }}
                                                            >
                                                                {String(children).replace(/\n$/, '')}
                                                            </SyntaxHighlighter>
                                                        </div>
                                                    ) : (
                                                        <code className={className}>
                                                            {children}
                                                        </code>
                                                    );
                                                }
                                            }}
                                        >
                                            {m.content}
                                        </ReactMarkdown>
                                    </div>
                                ) : (
                                    <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                                )}
                            </div>
                        </div>
                    ))
                )}
                {isLoading && (
                    <div className="flex flex-col items-start">
                        <div className="max-w-[85%] rounded-2xl px-4 py-2 text-sm bg-foreground/5 border border-border rounded-tl-none flex items-center gap-2">
                            <div className="flex gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"></span>
                            </div>
                            <span className="text-foreground/40 italic text-xs">AI is thinking...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
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
            <div className="p-3 border-t border-border bg-background relative">
                {showMentions && filteredFiles.length > 0 && (
                    <div className="absolute bottom-full left-3 right-3 mb-2 bg-background border border-border rounded-lg shadow-xl overflow-hidden z-50 max-h-48 overflow-y-auto">
                        <div className="p-2 border-b border-border bg-foreground/[0.03] text-[10px] uppercase font-bold text-foreground/40 tracking-wider">
                            Files
                        </div>
                        {filteredFiles.map(file => (
                            <button
                                key={file}
                                onClick={() => selectMention(file)}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-primary/10 hover:text-primary transition-colors flex items-center justify-between group"
                            >
                                <span className="truncate flex-1">{file}</span>
                            </button>
                        ))}
                    </div>
                )}
                <div className="relative flex items-end gap-2">
                    <textarea 
                        ref={textareaRef}
                        value={inputValue}
                        onChange={handleInputChange}
                        disabled={isLoading}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey && !showMentions && !isLoading) {
                                e.preventDefault();
                                handleSend();
                            }
                            if (e.key === 'Escape' && showMentions) {
                                setShowMentions(false);
                            }
                        }}
                        rows={1}
                        placeholder={isLoading ? "AI is thinking..." : "Ask Copilot... (use @ to mention files)"} 
                        className="w-full bg-foreground/5 border border-border rounded-lg pl-3 pr-10 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none min-h-[42px] max-h-[200px] transition-all scrollbar-hide disabled:opacity-50"
                    />
                    <button 
                        onClick={handleSend}
                        title="Send Message"
                        className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                        disabled={!inputValue.trim() || isLoading}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="19" x2="12" y2="5"></line>
                            <polyline points="5 12 12 5 19 12"></polyline>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
