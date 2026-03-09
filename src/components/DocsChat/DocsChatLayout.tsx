"use client";

import React, { useState } from "react";
import DocsSidebar, { Repository } from "./DocsSidebar";
import DocViewer from "./DocViewer";
import ChatPanel from "./ChatPanel";

interface DocsChatLayoutProps {
    repositories: Repository[];
}

export default function DocsChatLayout({ repositories }: DocsChatLayoutProps) {
    const [isChatting, setIsChatting] = useState(true);
    const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
    const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);

    React.useEffect(() => {
        const syncFromHash = () => {
            const hash = window.location.hash.replace(/^#/, "");
            const params = new URLSearchParams(hash);
            const doc = params.get("doc");
            const page = params.get("page");

            if (doc) {
                const repo = repositories.find(r => r.name === doc || r.id === doc);
                if (repo) {
                    setSelectedRepo(prev => (prev?.id === repo.id) ? prev : repo);
                } else {
                    setSelectedRepo(prev => prev !== null ? null : prev);
                }
            } else {
                setSelectedRepo(prev => prev !== null ? null : prev);
            }

            if (page) {
                setSelectedFilePath(prev => (prev === page) ? prev : page);
            } else {
                setSelectedFilePath(prev => prev !== null ? null : prev);
            }
        };

        // Run once on mount
        syncFromHash();
        
        // Listen to hash changes (for back/forward button clicks)
        window.addEventListener("hashchange", syncFromHash);
        
        return () => window.removeEventListener("hashchange", syncFromHash);
    }, [repositories]);

    React.useEffect(() => {
        if (!selectedRepo) return;
        const params = new URLSearchParams();
        params.set("doc", selectedRepo.name);
        if (selectedFilePath) {
            params.set("page", selectedFilePath);
        }
        const newHash = `#${params.toString()}`;
        if (window.location.hash !== newHash) {
            // Push state to browser history stack so the user can go "back"
            window.history.pushState(null, "", newHash);
        }
    }, [selectedRepo, selectedFilePath]);

    const handleStartChat = () => {
        setIsChatting(true);
    };

    const handleSelectRepo = (repo: Repository) => {
        if (selectedRepo?.id !== repo.id) {
            setSelectedRepo(repo);
            setSelectedFilePath(null); // Reset file selection when repo changes
        }
    };

    const handleSelectFile = (filePath: string) => {
        setSelectedFilePath(filePath);
    };

    return (
        <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
            {/* Left Sidebar - Always visible, fixed width */}
            <div className="w-80 shrink-0 border-r border-border/50 bg-foreground/[0.02] flex flex-col transition-all duration-300">
                <DocsSidebar 
                    repositories={repositories} 
                    selectedRepo={selectedRepo}
                    onSelectRepo={handleSelectRepo}
                    selectedFilePath={selectedFilePath}
                    onSelectFile={handleSelectFile}
                />
            </div>

            {/* Middle and Right Panes Container */}
            <div className="flex-1 flex overflow-hidden relative">
                
                {/* Middle Pane - Doc Viewer / Initial Chat Input */}
                <div 
                    className={`flex-1 flex flex-col transition-all duration-500 ease-in-out ${
                        isChatting ? "pr-[400px]" : "pr-0"
                    }`}
                >
                    <DocViewer 
                        selectedRepo={selectedRepo} 
                        selectedFilePath={selectedFilePath}
                        isChatting={isChatting}
                        onStartChat={handleStartChat}
                    />
                </div>

                {/* Right Pane - Active Chat Window */}
                <div 
                    className={`absolute top-0 right-0 h-full w-[400px] border-l border-border/50 bg-background shadow-2xl transition-transform duration-500 ease-in-out ${
                        isChatting ? "translate-x-0" : "translate-x-full"
                    }`}
                >
                    {isChatting && selectedRepo && (
                        <ChatPanel 
                            repo={selectedRepo} 
                            filePath={selectedFilePath} 
                            onSelectFile={handleSelectFile} 
                        />
                    )}
                    {isChatting && !selectedRepo && (
                        <div className="flex items-center justify-center h-full text-foreground/40 p-8 text-center">
                            Please select a repository to enable chat context.
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
