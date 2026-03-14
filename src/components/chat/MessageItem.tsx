"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Message } from "./ChatInterface";

interface MessageItemProps {
    msg: Message;
}

export default function MessageItem({ msg }: MessageItemProps) {
    return (
        <div 
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
        >
            <div 
                className={`group relative max-w-[85%] md:max-w-[75%] rounded-3xl px-5 py-3 text-sm shadow-sm transition-all ${
                    msg.role === "user" 
                        ? "bg-foreground text-background rounded-tr-sm" 
                        : "bg-foreground/5 border border-border/50 rounded-tl-sm"
                }`}
            >
                {msg.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed prose-p:my-1 prose-pre:my-2 prose-headings:my-2 prose-ul:my-1 prose-li:my-0 prose-code:text-foreground prose-code:bg-foreground/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
                        <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            components={{
                                code(props: { inline?: boolean; className?: string; children?: React.ReactNode }) {
                                    const { inline, className, children } = props;
                                    const match = /language-(\w+)/.exec(className || '');
                                    return !inline && match ? (
                                        <div className="my-3 rounded-xl overflow-hidden border border-border/50 shadow-2xl">
                                            <div className="bg-foreground/5 px-4 py-1.5 border-b border-border/50 flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">{match[1]}</span>
                                                <div className="flex gap-1.5">
                                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
                                                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20" />
                                                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
                                                </div>
                                            </div>
                                            <SyntaxHighlighter
                                                style={vscDarkPlus as { [key: string]: React.CSSProperties }}
                                                language={match[1]}
                                                PreTag="div"
                                                customStyle={{ margin: 0, padding: '1.25rem', fontSize: '12px', background: 'transparent' }}
                                            >
                                                {String(children).replace(/\n$/, '')}
                                            </SyntaxHighlighter>
                                        </div>
                                    ) : (
                                        <code className={`${className} bg-foreground/10 px-1.5 py-0.5 rounded font-mono text-xs`}>
                                            {children}
                                        </code>
                                    );
                                }
                            }}
                        >
                            {msg.content}
                        </ReactMarkdown>
                    </div>
                ) : (
                    <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                )}
            </div>
        </div>
    );
}
