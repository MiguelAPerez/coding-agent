"use client";

import React, { useState } from "react";
import DocsSidebar, { Repository } from "./DocsSidebar";
import DocViewer from "./DocViewer";
import ChatPanel from "./ChatPanel";

interface DocsChatLayoutProps {
    repositories: Repository[];
}

export default function DocsChatLayout({ repositories }: DocsChatLayoutProps) {
    const [isChatting, setIsChatting] = useState(false);
    const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
    const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);

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
                    {isChatting && <ChatPanel />}
                </div>

            </div>
        </div>
    );
}
