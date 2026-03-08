"use client";

import React, { useState, useEffect } from "react";
import { Repository } from "./DocsSidebar";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import mermaid from 'mermaid';
import { getRepoFileContent } from "@/app/actions/files";

mermaid.initialize({ startOnLoad: false, theme: 'dark' });

function MermaidDisplay({ chart }: { chart: string }) {
    const [svg, setSvg] = useState<string>('');

    useEffect(() => {
        let isMounted = true;
        const renderChart = async () => {
            try {
                const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
                const { svg } = await mermaid.render(id, chart);
                if (isMounted) setSvg(svg);
            } catch (err) {
                console.error("Mermaid error:", err);
                if (isMounted) setSvg(`<div class="text-red-500">Error rendering diagram</div>`);
            }
        };
        renderChart();
        return () => { isMounted = false; };
    }, [chart]);

    return (
        <div 
            className="flex justify-center my-8 p-4 bg-foreground/5 rounded-xl border border-border/50" 
            dangerouslySetInnerHTML={{ __html: svg || 'Rendering diagram...' }} 
        />
    );
}

interface DocViewerProps {
    selectedRepo: Repository | null;
    selectedFilePath: string | null;
    isChatting: boolean;
    onStartChat: () => void;
}

export default function DocViewer({ selectedRepo, selectedFilePath, isChatting, onStartChat }: DocViewerProps) {
    const [initialMessage, setInitialMessage] = useState("");
    const [fileContent, setFileContent] = useState<string | null>(null);
    const [isLoadingFile, setIsLoadingFile] = useState(false);

    useEffect(() => {
        // Only load if chatting UI is active or we decided to auto-show doc
        if (selectedRepo && selectedFilePath) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIsLoadingFile(true);
            getRepoFileContent(selectedRepo.id, selectedFilePath)
                .then(content => {
                    setFileContent(content);
                })
                .catch(err => {
                    console.error("Error loading file content:", err);
                    setFileContent("Failed to load file content.");
                })
                .finally(() => {
                    setIsLoadingFile(false);
                });
        }
    }, [selectedRepo, selectedFilePath]);

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (initialMessage.trim()) {
            onStartChat();
            // In a real implementation we would also pass this message to the chat panel state
            // For now, it just triggers the layout shift
        }
    };

    const markdownComponents = React.useMemo(() => ({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        code(props: any) {
            const { children, className, ...rest } = props;
            const match = /language-(\w+)/.exec(className || '');

            // Extract ref and node from rest to avoid passing them down
            // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
            const { ref, node, ...safeRest } = rest as any;
            
            if (match && match[1] === 'mermaid') {
                return <MermaidDisplay chart={String(children).replace(/\n$/, '')} />;
            }

            return match ? (
                <div className="rounded-md overflow-hidden my-4 border border-border/50" dir="ltr">
                    <div className="bg-foreground/5 px-4 py-1.5 text-xs text-foreground/50 border-b border-border/50 font-mono flex items-center justify-between">
                        <span>{match[1]}</span>
                    </div>
                    <SyntaxHighlighter
                        {...safeRest}
                        PreTag="div"
                        language={match[1]}
                        style={vscDarkPlus}
                        customStyle={{ margin: 0, padding: '1rem', background: 'var(--card)' }}
                    >
                        {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                </div>
            ) : (
                <code {...rest} className={`${className} bg-foreground/10 px-1.5 py-0.5 rounded text-sm`}>
                    {children}
                </code>
            )
        }
    }), []);
    
    if (!isChatting && !selectedFilePath) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
                <div className="max-w-xl w-full text-center space-y-8">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
                            Chat with your Docs
                        </h1>
                        <p className="text-lg text-foreground/50">
                            Select a repository and document on the left, or ask a question below to get started.
                        </p>
                    </div>

                    <form onSubmit={handleFormSubmit} className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-foreground/20 to-foreground/0 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                        <div className="relative bg-background rounded-2xl shadow-xl border border-border/50 flex">
                            <input
                                type="text"
                                value={initialMessage}
                                onChange={(e) => setInitialMessage(e.target.value)}
                                placeholder="E.g., How do I deploy this application?"
                                className="flex-1 bg-transparent px-6 py-4 text-lg focus:outline-none rounded-l-2xl placeholder:text-foreground/30"
                            />
                            <button
                                type="submit"
                                className="px-6 py-4 font-medium hover:bg-foreground/5 rounded-r-2xl transition-colors shrink-0"
                            >
                                Ask Agent
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    if (!selectedRepo) {
        return (
            <div className="flex-1 flex items-center justify-center text-foreground/40">
                Please select a document from the sidebar to view it here.
            </div>
        );
    }

    if (!selectedFilePath) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-foreground/40">
                <p>Repository: <strong>{selectedRepo.fullName}</strong> selected.</p>
                <p className="mt-2 text-sm">Please select a specific markdown file from the sidebar.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
            <div className="p-6 border-b border-border/50 shrink-0 flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold">{selectedFilePath.split('/').pop()}</h1>
                    <p className="text-foreground/50 text-sm mt-1">{selectedRepo.fullName} • {selectedFilePath}</p>
                </div>
                {!isChatting && (
                    <button
                        onClick={onStartChat}
                        className="p-2 text-foreground/50 hover:text-foreground hover:bg-foreground/5 rounded-lg transition-colors"
                        title="Open Chat Agent"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                    </button>
                )}
            </div>
            <div className="flex-1 overflow-y-auto p-8">
                {isLoadingFile ? (
                    <div className="flex items-center justify-center h-40 text-foreground/50">
                        <span className="w-5 h-5 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin mr-3"></span>
                        Loading markdown...
                    </div>
                ) : (
                    <article className="prose prose-neutral dark:prose-invert max-w-4xl mx-auto pb-20 prose-pre:p-0 prose-pre:bg-transparent">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={markdownComponents}
                        >
                            {fileContent || "Document is empty."}
                        </ReactMarkdown>
                    </article>
                )}
            </div>
        </div>
    );
}
