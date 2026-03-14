import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

interface MessageItemProps {
    role: string;
    content: string;
}

export function MessageItem({ role, content }: MessageItemProps) {
    return (
        <div className={`flex flex-col ${role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                role === 'user' 
                ? 'bg-primary text-primary-foreground rounded-tr-none' 
                : 'bg-foreground/5 border border-border rounded-tl-none'
            }`}>
                {role === 'assistant' ? (
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
                            {content}
                        </ReactMarkdown>
                    </div>
                ) : (
                    <div className="whitespace-pre-wrap leading-relaxed">{content}</div>
                )}
            </div>
        </div>
    );
}
