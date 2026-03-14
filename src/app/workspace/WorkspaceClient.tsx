"use client";

import React, { useState, useCallback } from "react";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
    setSelectedRepoId,
    setActiveTabPath,
    setActiveLeftTab,
} from "@/lib/store/features/workspace/workspaceSlice";
import { setIsTerminalOpen } from "@/lib/store/features/terminal/terminalSlice";
import { setChatTab, setSelectedAgentId } from "@/lib/store/features/chat/chatSlice";

import WorkspaceTopBar from "./components/WorkspaceTopBar";
import FileTree from "./components/FileTree";
import EditorArea from "./components/EditorArea";
import ChatPanel from "./components/ChatPanel";
import Terminal from "./components/Terminal";
import SourceControlPanel from "./components/SourceControlPanel";

import { useWorkspaceInit } from "./hooks/useWorkspaceInit";
import { useFileManagement } from "./hooks/useFileManagement";
import { useGitOperations } from "./hooks/useGitOperations";
import { useChatInteraction } from "./hooks/useChatInteraction";
import { useTerminalExecution } from "./hooks/useTerminalExecution";

interface Repo {
    id: string;
    fullName: string;
    name: string;
    source: string;
}

export interface Tab {
    path: string;
    content: string;
    originalContent: string;
    gitHeadContent: string | null;
    gitIndexContent: string | null;
    isDirty: boolean;
}

export interface FileNode {
    name: string;
    type: "file" | "directory";
    children?: FileNode[];
}

export default function WorkspaceClient({ initialRepos }: { initialRepos: Repo[] }) {
    const dispatch = useAppDispatch();
    
    // Core State from Redux
    const selectedRepoId = useAppSelector((state) => state.workspace.selectedRepoId);
    const branches = useAppSelector((state) => state.workspace.branches);
    const selectedBranch = useAppSelector((state) => state.workspace.selectedBranch);
    const fileTree = useAppSelector((state) => state.workspace.fileTree);
    const changedFiles = useAppSelector((state) => state.workspace.changedFiles);
    const isMainProtected = useAppSelector((state) => state.workspace.isMainProtected);
    const activeLeftTab = useAppSelector((state) => state.workspace.activeLeftTab);
    const isTerminalOpen = useAppSelector((state) => state.terminal.isTerminalOpen);
    const activeSandbox = useAppSelector((state) => state.terminal.activeSandbox);

    // Initial Repos
    const [repos] = useState<Repo[]>(initialRepos);

    // Hooks
    const { isLoadingInit, syncCurrentBranch, addLog } = useWorkspaceInit();
    const {
        openTabs,
        activeTabPath,
        handleFileSelect,
        handleTabClose,
        handleContentChange,
        handleSaveFile,
        handleRevertFile,
        loadChangedFiles,
    } = useFileManagement();
    const {
        commitMessage,
        setCommitMessage,
        isPushing,
        isCommitting,
        gitRefreshKey,
        refreshGit,
        handleCreateBranch,
        handleCheckoutBranch,
        handleCommit,
        handlePush,
        handleStageFile,
        handleUnstageFile,
    } = useGitOperations(loadChangedFiles, syncCurrentBranch, addLog);
    const {
        isChatLoading,
        chatMessages,
        agents,
        selectedAgentId,
        pendingSuggestion,
        chatTab,
        contextFiles,
        handleSendMessage,
        handleApproveSuggestion,
        handleRejectSuggestion,
        handleRemoveContext,
        handleAddContext,
    } = useChatInteraction(handleSaveFile, loadChangedFiles, refreshGit);
    const {
        terminalLogs,
        isFollowMode,
        handleExecuteCommand,
        handleClearLogs,
        toggleFollowMode,
    } = useTerminalExecution(syncCurrentBranch, addLog);

    // Helpers
    const getAllFiles = useCallback(function getAll(nodes: FileNode[], prefix = ""): string[] {
        let files: string[] = [];
        for (const node of nodes) {
            const currentPath = prefix ? `${prefix}/${node.name}` : node.name;
            if (node.type === "file") {
                files.push(currentPath);
            } else if (node.children) {
                files = [...files, ...getAll(node.children, currentPath)];
            }
        }
        return files;
    }, []);

    const handleRefreshTree = useCallback(async () => {
        if (!selectedRepoId) return;
        loadChangedFiles(selectedRepoId);
    }, [selectedRepoId, loadChangedFiles]);

    return (
        <div className="flex flex-col flex-1 h-full bg-background border-t border-border">
            <WorkspaceTopBar
                repos={repos}
                selectedRepoId={selectedRepoId}
                onSelectRepo={(id) => dispatch(setSelectedRepoId(id))}
                branches={branches}
                selectedBranch={selectedBranch}
                onSelectBranch={handleCheckoutBranch}
                onCreateBranch={handleCreateBranch}
                isTerminalOpen={isTerminalOpen}
                onToggleTerminal={() => dispatch(setIsTerminalOpen(!isTerminalOpen))}
                sandboxName={activeSandbox?.name}
                isProtected={isMainProtected && selectedBranch === "main"}
            />

            <div className="flex-1 overflow-hidden relative group">
                {isLoadingInit && (
                    <div className="absolute inset-0 z-50 bg-background/50 flex items-center justify-center backdrop-blur-sm">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                )}

                <PanelGroup orientation="horizontal">
                    <Panel defaultSize={20} minSize={10} className="border-r border-border bg-foreground/[0.02]">
                        <div className="flex h-full">
                            {/* Activity Bar */}
                            <div className="w-12 border-r border-border bg-background/50 flex flex-col items-center py-4 gap-4">
                                <button 
                                    onClick={() => dispatch(setActiveLeftTab("files"))}
                                    className={`p-2 rounded-lg transition-all ${activeLeftTab === "files" ? "bg-primary/10 text-primary shadow-sm" : "text-foreground/40 hover:text-foreground/60 hover:bg-foreground/5"}`}
                                    title="Explorer"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"></path>
                                        <polyline points="14 2 14 8 20 8"></polyline>
                                        <path d="M2 15h10"></path>
                                        <path d="m9 18 3-3-3-3"></path>
                                    </svg>
                                </button>
                                <button 
                                    onClick={() => dispatch(setActiveLeftTab("git"))}
                                    className={`p-2 rounded-lg transition-all relative ${activeLeftTab === "git" ? "bg-primary/10 text-primary shadow-sm" : "text-foreground/40 hover:text-foreground/60 hover:bg-foreground/5"}`}
                                    title="Source Control"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="6" y1="3" x2="6" y2="15"></line>
                                        <circle cx="18" cy="6" r="3"></circle>
                                        <circle cx="6" cy="18" r="3"></circle>
                                        <path d="M18 9a9 9 0 0 1-9 9"></path>
                                    </svg>
                                    {changedFiles.filter(f => f.status.charAt(0) !== ' ' && f.status.charAt(0) !== '?').length > 0 && (
                                        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center border-2 border-background">
                                            {(() => {
                                                const count = changedFiles.filter(f => f.status.charAt(0) !== ' ' && f.status.charAt(0) !== '?').length;
                                                return count > 9 ? '9+' : count;
                                            })()}
                                        </div>
                                    )}
                                </button>
                            </div>

                            {/* Tab Content */}
                            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                                {activeLeftTab === "files" && (
                                    <div className="flex-1 flex flex-col min-h-0">
                                        <div className="px-4 py-2 border-b border-border bg-foreground/[0.03]">
                                            <span className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">Explorer</span>
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <FileTree 
                                                tree={fileTree} 
                                                onSelectFile={handleFileSelect} 
                                                changedFiles={changedFiles} 
                                                onRevertFile={handleRevertFile}
                                                onStageFile={handleStageFile}
                                                onUnstageFile={handleUnstageFile}
                                                onRefresh={handleRefreshTree}
                                            />
                                        </div>
                                    </div>
                                )}

                                {activeLeftTab === "git" && (
                                    <SourceControlPanel
                                        selectedRepoId={selectedRepoId}
                                        selectedBranch={selectedBranch}
                                        commitMessage={commitMessage}
                                        setCommitMessage={setCommitMessage}
                                        isCommitting={isCommitting}
                                        isPushing={isPushing}
                                        isMainProtected={isMainProtected}
                                        handleCommit={handleCommit}
                                        handlePush={handlePush}
                                        gitRefreshKey={gitRefreshKey}
                                    />
                                )}
                            </div>
                        </div>
                    </Panel>

                    <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors" />
                    
                    <Panel defaultSize={55} minSize={30}>
                        <PanelGroup orientation="vertical" key={isTerminalOpen ? "terminal-open" : "terminal-closed"}>
                            <Panel defaultSize={isTerminalOpen ? 70 : 100} minSize={30}>
                                <EditorArea
                                    tabs={openTabs}
                                    activeTabPath={activeTabPath}
                                    onTabSelect={(path) => dispatch(setActiveTabPath(path))}
                                    onTabClose={handleTabClose}
                                    onContentChange={handleContentChange}
                                    onSaveFile={handleSaveFile}
                                    pendingSuggestion={pendingSuggestion}
                                />
                            </Panel>
                            
                            {isTerminalOpen && (
                                <>
                                    <PanelResizeHandle className="h-1 bg-border hover:bg-primary/50 transition-colors" />
                                    <Panel defaultSize={30} minSize={15}>
                                        <Terminal 
                                            logs={terminalLogs}
                                            onExecute={(cmd) => handleExecuteCommand(cmd, repos.find(r => r.id === selectedRepoId)?.name)}
                                            isSandboxConnected={!!activeSandbox}
                                            sandboxName={activeSandbox?.name}
                                            isFollowMode={isFollowMode}
                                            onToggleFollow={toggleFollowMode}
                                            onClearLogs={handleClearLogs}
                                        />
                                    </Panel>
                                </>
                            )}
                        </PanelGroup>
                    </Panel>

                    <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors" />

                    <Panel defaultSize={25} minSize={15} className="border-l border-border bg-foreground/[0.02]">
                            <ChatPanel 
                                contextFiles={contextFiles} 
                                onRemoveContext={handleRemoveContext}
                                onSendMessage={handleSendMessage}
                                pendingSuggestion={pendingSuggestion}
                                onApproveSuggestion={handleApproveSuggestion}
                                onRejectSuggestion={handleRejectSuggestion}
                                onJumpToFile={handleFileSelect}
                                activeTab={chatTab}
                                onTabChange={(tab) => dispatch(setChatTab(tab))}
                                agents={agents}
                                selectedAgentId={selectedAgentId}
                                onSelectAgent={(id) => dispatch(setSelectedAgentId(id))}
                                messages={chatMessages}
                                isLoading={isChatLoading}
                                allFiles={getAllFiles(fileTree)}
                                onAddContext={handleAddContext}
                            />
                    </Panel>
                </PanelGroup>
            </div>
        </div>
    );
}

// Re-exporting for use in components/hooks
export { setChatTab, setSelectedAgentId } from "@/lib/store/features/chat/chatSlice";
