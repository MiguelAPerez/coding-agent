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
    const [fileContent, setFileContent] = useState<string | null>(null);
    const [isLoadingFile, setIsLoadingFile] = useState(false);

    useEffect(() => {
        // Only load if chatting UI is active or we decided to auto-show doc
        if (selectedRepo && selectedFilePath) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIsLoadingFile(true);
            getRepoFileContent(selectedRepo.id, selectedFilePath)
                .then(content => {
                    // Logic to strip YAML frontmatter (--- ... ---)
                    const frontmatterRegex = /^---\s*[\s\S]*?---\s*/;
                    const strippedContent = content.replace(frontmatterRegex, '');
                    setFileContent(strippedContent);
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
    
    if (!selectedRepo) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
                <div className="w-16 h-16 bg-foreground/5 rounded-2xl flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                </div>
                <div className="max-w-md">
                    <h1 className="text-2xl font-bold tracking-tight mb-2">Welcome to DocsChat</h1>
                    <p className="text-foreground/50">
                        Select a repository and a document from the sidebar to start chat context and view content.
                    </p>
                </div>
            </div>
        );
    }

    if (!selectedFilePath) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
                <div className="w-16 h-16 bg-foreground/5 rounded-2xl flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <div className="max-w-md">
                    <h1 className="text-xl font-semibold">Repository: {selectedRepo.fullName}</h1>
                    <p className="text-foreground/50 mt-2">
                        Great! Now select a specific markdown file from the sidebar to begin.
                    </p>
                </div>
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
