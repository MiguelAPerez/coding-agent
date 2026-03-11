"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";
import WorkspaceTopBar from "./components/WorkspaceTopBar";
import FileTree from "./components/FileTree";
import EditorArea from "./components/EditorArea";
import ChatPanel from "./components/ChatPanel";

import {
    initWorkspace,
    getRepoBranches,
    checkoutBranch,
    getRepoFileTree,
    getWorkspaceFileContent,
    saveWorkspaceFile,
    getWorkspaceChangedFiles,
    getGitFileContent,
    revertWorkspaceFile
} from "@/app/actions/workspace";

export interface FileChange {
    startLine: number;
    endLine: number;
    column: number;
    originalContent: string;
    suggestedContent: string;
}

export interface PendingSuggestion {
    chatId: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messages: any[];
    filesChanged: Record<string, FileChange>;
}

interface Repo {
    id: string;
    fullName: string;
    name: string;
    source: string;
}

export interface FileNode {
    name: string;
    path: string;
    type: "file" | "directory";
    children?: FileNode[];
}

export interface Tab {
    path: string;
    content: string;
    originalContent: string;
    gitHeadContent: string | null;
    isDirty: boolean;
}

export default function WorkspaceClient({ initialRepos }: { initialRepos: Repo[] }) {
    const [repos] = useState<Repo[]>(initialRepos);
    const [selectedRepoId, setSelectedRepoId] = useState<string>(initialRepos[0]?.id || "");
    const [branches, setBranches] = useState<string[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<string>("main");

    const [fileTree, setFileTree] = useState<FileNode[]>([]);
    const [openTabs, setOpenTabs] = useState<Tab[]>([]);
    const [activeTabPath, setActiveTabPath] = useState<string | null>(null);
    const [changedFiles, setChangedFiles] = useState<{ path: string, status: string }[]>([]);
    // Files used as reference by our agent
    const [contextFiles, setContextFiles] = useState<string[]>([]);
    const [pendingSuggestion, setPendingSuggestion] = useState<PendingSuggestion | null>(null);
    const [chatTab, setChatTab] = useState<"context" | "suggestions" | null>(null);

    const [isLoadingInit, setIsLoadingInit] = useState(false);

    const loadChangedFiles = useCallback(async (repoId: string) => {
        const changes = await getWorkspaceChangedFiles(repoId);
        setChangedFiles(changes);
    }, []);

    // Load workspace when repo changes
    useEffect(() => {
        if (!selectedRepoId) return;

        let active = true;

        async function loadRepoEnv() {
            setIsLoadingInit(true);
            try {
                await initWorkspace(selectedRepoId);
                if (!active) return;

                const bs = await getRepoBranches(selectedRepoId);
                if (!active) return;
                setBranches(bs);

                const initialBranch = bs.includes("main") ? "main" : (bs[0] || "main");
                setSelectedBranch(initialBranch);
            } catch (e) {
                console.error("Failed to init workspace", e);
            } finally {
                if (active) setIsLoadingInit(false);
            }
        }

        loadRepoEnv();

        return () => { active = false; };
    }, [selectedRepoId]);

    // Load branch constraints when repo + branch changes
    useEffect(() => {
        if (!selectedRepoId || !selectedBranch || isLoadingInit) return;
        let active = true;

        async function loadBranchEnv() {
            try {
                await checkoutBranch(selectedRepoId, selectedBranch);
                if (!active) return;

                const tree = await getRepoFileTree(selectedRepoId);
                if (!active) return;
                setFileTree(tree);

                await loadChangedFiles(selectedRepoId);
            } catch (e) {
                console.error("Failed branch env setup", e);
            }
        }

        loadBranchEnv();
        // optionally clear tabs on branch switch
        return () => { active = false; };
    }, [selectedRepoId, selectedBranch, isLoadingInit, loadChangedFiles]);

    const handleFileSelect = async (path: string) => {

        const existingTab = openTabs.find(t => t.path === path);
        if (existingTab) {
            setActiveTabPath(path);
            return;
        }

        try {
            const [content, gitHeadContent] = await Promise.all([
                getWorkspaceFileContent(selectedRepoId, path).catch(() => ""),
                getGitFileContent(selectedRepoId, path).catch(() => null)
            ]);

            const newTab: Tab = {
                path,
                content,
                originalContent: content,
                gitHeadContent,
                isDirty: false
            };
            setOpenTabs(prev => [...prev, newTab]);
            setActiveTabPath(path);
        } catch (e) {
            console.error("Failed to read file", e);
            alert("Could not load file");
        }
    };

    const handleSendMessage = (message: string) => {
        if (!activeTabPath || openTabs.length === 0) {
            alert("Please open a file first to mock a suggestion.");
            return;
        }

        const activeTab = openTabs.find(t => t.path === activeTabPath);
        if (!activeTab) return;

        // Mock Ai editing lines in multiple files
        const changeRequest = {
            chatId: 0,
            messages: [],
            filesChanged: {
                [activeTabPath]: {
                    'startLine': 0,
                    'endLine': 0,
                    'column': 0,
                    'originalContent': activeTab.content,
                    'suggestedContent': activeTab.content + `\n// 🤖 AI Suggestion applied here for: ${message}`
                },
                'Dockerfile': {
                    'startLine': 0,
                    'endLine': 0,
                    'column': 0,
                    'originalContent': '',
                    'suggestedContent': 'FROM ubuntu:24.04'
                }
            }
        }

        setPendingSuggestion(changeRequest);
        setChatTab("suggestions");

        // Update all affected tab contents that are already open
        Object.entries(changeRequest.filesChanged).forEach(([path, change]) => {
            const isOpen = openTabs.some(t => t.path === path);
            if (isOpen) {
                handleContentChange(path, change.suggestedContent);
            }
            if (!contextFiles.includes(path)) {
                setContextFiles(prev => [...prev, path]);
            }
        });
    };

    const handleApproveSuggestion = async () => {
        if (pendingSuggestion) {
            for (const [path, change] of Object.entries(pendingSuggestion.filesChanged) as [string, FileChange][]) {
                const isOpen = openTabs.some(t => t.path === path);
                if (isOpen) {
                    await handleSaveFile(path);
                } else {
                    // For files not currently open, we save directly to disk
                    try {
                        await saveWorkspaceFile(selectedRepoId, path, change.suggestedContent);
                    } catch (e) {
                        console.error("Failed to save background file", e);
                    }
                }
            }
            // Trigger a refresh of changed files
            await loadChangedFiles(selectedRepoId);
        }
        setPendingSuggestion(null);
        setChatTab(null);
    };

    const handleRejectSuggestion = () => {
        if (pendingSuggestion) {
            for (const [path, change] of Object.entries(pendingSuggestion.filesChanged) as [string, FileChange][]) {
                const isOpen = openTabs.some(t => t.path === path);
                if (isOpen) {
                    handleContentChange(path, change.originalContent);
                }
            }
            setPendingSuggestion(null);
            setChatTab(null);
        }
    };

    const handleTabClose = (path: string) => {
        setOpenTabs(prev => {
            const newTabs = prev.filter(t => t.path !== path);
            if (activeTabPath === path) {
                setActiveTabPath(newTabs.length > 0 ? newTabs[newTabs.length - 1].path : null);
            }
            return newTabs;
        });
    };

    const handleContentChange = (path: string, newContent: string) => {
        setOpenTabs(prev => prev.map(tab => {
            if (tab.path === path) {
                return { ...tab, content: newContent, isDirty: newContent !== tab.originalContent };
            }
            return tab;
        }));
    };

    const handleSaveFile = async (path: string) => {
        const tab = openTabs.find(t => t.path === path);
        if (!tab || !tab.isDirty) return;

        try {
            await saveWorkspaceFile(selectedRepoId, path, tab.content);
            setOpenTabs(prev => prev.map(t => {
                if (t.path === path) {
                    return { ...t, originalContent: t.content, isDirty: false };
                }
                return t;
            }));
            await loadChangedFiles(selectedRepoId);
        } catch (e) {
            console.error("Failed to save", e);
            alert("Failed to save file");
        }
    };

    const handleRevertFile = async (path: string) => {
        if (!confirm(`Are you sure you want to revert changes to ${path}?`)) return;

        try {
            const res = await revertWorkspaceFile(selectedRepoId, path);
            if (res.success) {
                // If it was restored, we fetch the latest content to update tabs.
                if (res.action === "restored") {
                    const content = await getWorkspaceFileContent(selectedRepoId, path);
                    const gitContent = await getGitFileContent(selectedRepoId, path);
                    setOpenTabs(prev => prev.map(t => {
                        if (t.path === path) {
                            return { ...t, content, originalContent: content, gitHeadContent: gitContent, isDirty: false };
                        }
                        return t;
                    }));
                } else if (res.action === "deleted") {
                    // It was an untracked file and got deleted; close it
                    handleTabClose(path);
                }
                await loadChangedFiles(selectedRepoId);
            }
        } catch (e) {
            console.error("Failed to revert file", e);
            alert("Failed to revert file");
        }
    };

    const handleRemoveContext = (path: string) => {
        setContextFiles(prev => prev.filter(p => p !== path));
    };

    return (
        <div className="flex flex-col flex-1 h-full bg-background border-t border-border">
            <WorkspaceTopBar
                repos={repos}
                selectedRepoId={selectedRepoId}
                onSelectRepo={setSelectedRepoId}
                branches={branches}
                selectedBranch={selectedBranch}
                onSelectBranch={setSelectedBranch}
            />

            <div className="flex-1 overflow-hidden relative group">
                {isLoadingInit && (
                    <div className="absolute inset-0 z-50 bg-background/50 flex items-center justify-center backdrop-blur-sm">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                )}

                <PanelGroup orientation="horizontal">
                    <Panel defaultSize={20} minSize={10} className="border-r border-border bg-foreground/[0.02]">
                        <FileTree tree={fileTree} onSelectFile={handleFileSelect} changedFiles={changedFiles} onRevertFile={handleRevertFile} />
                    </Panel>

                    <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors" />

                    <Panel defaultSize={55} minSize={30}>
                        <EditorArea
                            tabs={openTabs}
                            activeTabPath={activeTabPath}
                            onTabSelect={setActiveTabPath}
                            onTabClose={handleTabClose}
                            onContentChange={handleContentChange}
                            onSaveFile={handleSaveFile}
                            pendingSuggestion={pendingSuggestion}
                        />
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
                                onTabChange={setChatTab}
                            />
                    </Panel>
                </PanelGroup>
            </div>
        </div>
    );
}
