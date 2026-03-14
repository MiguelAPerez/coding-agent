import React, { useState, useRef, useEffect } from "react";

interface ChatInputProps {
    onSendMessage: (message: string) => void;
    isLoading: boolean;
    allFiles: string[];
    onAddContext?: (path: string) => void;
}

export function ChatInput({ onSendMessage, isLoading, allFiles, onAddContext }: ChatInputProps) {
    const [inputValue, setInputValue] = useState("");
    const [showMentions, setShowMentions] = useState(false);
    const [mentionQuery, setMentionQuery] = useState("");
    const [mentionStartIndex, setMentionStartIndex] = useState(-1);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
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

        const lastAtIndex = value.lastIndexOf('@', cursorPosition - 1);
        if (lastAtIndex !== -1) {
            const textAfterAt = value.substring(lastAtIndex + 1, cursorPosition);
            const charBeforeAt = lastAtIndex > 0 ? value[lastAtIndex - 1] : ' ';
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
        setInputValue(`${before}@${file}${after}`);
        onAddContext(file);
        setShowMentions(false);
        textareaRef.current?.focus();
    };

    const filteredFiles = allFiles
        .filter(f => f.toLowerCase().includes(mentionQuery))
        .slice(0, 10);

    return (
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
    );
}
