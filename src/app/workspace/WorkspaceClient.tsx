"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
    setSelectedRepoId,
    setBranches,
    setSelectedBranch,
    setFileTree,
    setActiveTabPath,
    setChangedFiles,
    setIsLoadingInit,
    setIsMainProtected,
    setActiveLeftTab,
    updateTabContent,
    addTab,
    closeTab,
    setTabSaved,
    setCommitMessage,
    revertTab
} from "@/lib/store/features/workspace/workspaceSlice";
import {
    addChatMessage,
    setAgents,
    setSelectedAgentId,
    setPendingSuggestion,
    setChatTab,
    addContextFile,
    removeContextFile,
    updateChatMessage,
    clearChat
} from "@/lib/store/features/chat/chatSlice";
import {
    addTerminalLog,
    setIsTerminalOpen,
    setIsFollowMode,
    setActiveSandbox,
    clearTerminalLogs
} from "@/lib/store/features/terminal/terminalSlice";
import WorkspaceTopBar from "./components/WorkspaceTopBar";
import FileTree from "./components/FileTree";
import EditorArea from "./components/EditorArea";
import ChatPanel from "./components/ChatPanel";
import Terminal from "./components/Terminal";
import GitLog from "./components/GitLog";

import { initWorkspace } from "@/app/actions/workspace";
import { 
    listSandboxes, 
    executeSandboxCommand 
} from "@/app/actions/docker-sandboxes";
import {
    getRepoBranches,
    checkoutBranch,
    createBranch,
    commitChanges,
    pushChanges,
    stageFile,
    unstageFile,
    setupGitAuth,
    getCurrentBranch
} from "@/app/actions/git";
import {
    FileChange,
    ChatMessage
} from "@/app/actions/chat";
import {
    getRepoFileTree,
    getWorkspaceFileContent,
    saveWorkspaceFile,
    getWorkspaceChangedFiles,
    getGitFileContent,
    revertWorkspaceFile,
    FileNode
} from "@/app/actions/workspace-files";
import { getAgentConfigs } from "@/app/actions/config";
import { getBranchProtection } from "@/app/actions/settings";
import { parseDiffs } from "@/lib/chat/utils";


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

interface LogEntry {
    type: "input" | "stdout" | "stderr" | "info";
    content: string;
    timestamp: number;
}

export default function WorkspaceClient({ initialRepos }: { initialRepos: Repo[] }) {
    const dispatch = useAppDispatch();
    
    // Core Workspace State from Redux
    const selectedRepoId = useAppSelector((state) => state.workspace.selectedRepoId);
    const branches = useAppSelector((state) => state.workspace.branches);
    const selectedBranch = useAppSelector((state) => state.workspace.selectedBranch);
    const fileTree = useAppSelector((state) => state.workspace.fileTree);
    const openTabs = useAppSelector((state) => state.workspace.openTabs);
    const activeTabPath = useAppSelector((state) => state.workspace.activeTabPath);
    const changedFiles = useAppSelector((state) => state.workspace.changedFiles);
    const isLoadingInit = useAppSelector((state) => state.workspace.isLoadingInit);
    const isMainProtected = useAppSelector((state) => state.workspace.isMainProtected);
    const activeLeftTab = useAppSelector((state) => state.workspace.activeLeftTab);

    // Chat State from Redux
    const chatMessages = useAppSelector((state) => state.chat.chatMessages);
    const agents = useAppSelector((state) => state.chat.agents);
    const selectedAgentId = useAppSelector((state) => state.chat.selectedAgentId);
    const pendingSuggestion = useAppSelector((state) => state.chat.pendingSuggestion);
    const chatTab = useAppSelector((state) => state.chat.chatTab);
    const contextFiles = useAppSelector((state) => state.chat.contextFiles);

    // Terminal State from Redux
    const commitMessage = useAppSelector(state => state.workspace.commitMessage);
    const isTerminalOpen = useAppSelector(state => state.terminal.isTerminalOpen);
    const terminalLogs = useAppSelector((state) => state.terminal.terminalLogs);
    const isFollowMode = useAppSelector(state => state.terminal.isFollowMode);
    const activeSandbox = useAppSelector((state) => state.terminal.activeSandbox);

    // Local-only UI state
    const [repos] = useState<Repo[]>(initialRepos);
    const [isPushing, setIsPushing] = useState(false);
    const [isCommitting, setIsCommitting] = useState(false);
    const [gitRefreshKey, setGitRefreshKey] = useState(0);
    const [isChatLoading, setIsChatLoading] = useState(false);
    const savingFiles = useRef<Set<string>>(new Set());

    const refreshGit = useCallback(() => setGitRefreshKey(prev => prev + 1), []);

    const syncCurrentBranch = useCallback(async () => {
        if (!selectedRepoId) return;
        const res = await getCurrentBranch(selectedRepoId);
        if (res.success) {
            dispatch(setSelectedBranch(res.branch));
        }
    }, [selectedRepoId, dispatch]);

    const loadChangedFiles = useCallback(async (repoId: string) => {
        const changes = await getWorkspaceChangedFiles(repoId);
        dispatch(setChangedFiles(changes));
    }, [dispatch]);

    const addLog = useCallback((type: LogEntry["type"], content: string) => {
        dispatch(addTerminalLog({ type, content }));
    }, [dispatch]);

    // Clear state when repo changes
    useEffect(() => {
        if (!selectedRepoId) return;
        dispatch(clearTerminalLogs());
        dispatch(setActiveSandbox(null));
        dispatch(clearChat());
    }, [selectedRepoId, dispatch]);

    // Load agents on mount
    useEffect(() => {
        let active = true;
        async function loadAgents() {
            const configs = await getAgentConfigs();
            if (!active) return;
            dispatch(setAgents(configs.map(c => ({ id: c.id, name: c.name }))));
            if (configs.length > 0 && !selectedAgentId) {
                dispatch(setSelectedAgentId(configs[0].id));
            }
        }
        loadAgents();
        return () => { active = false; };
    }, [dispatch, selectedAgentId]);

    // Load workspace when repo changes
    useEffect(() => {
        if (!selectedRepoId) return;

        let active = true;

        async function loadRepoEnv() {
            dispatch(setIsLoadingInit(true));
            try {
                await initWorkspace(selectedRepoId);
                if (!active) return;

                const bs = await getRepoBranches(selectedRepoId);
                if (!active) return;
                dispatch(setBranches(bs));

                const initialBranch = bs.includes("main") ? "main" : (bs[0] || "main");
                dispatch(setSelectedBranch(initialBranch));

                const protection = await getBranchProtection();
                if (active) dispatch(setIsMainProtected(protection));
                
                await syncCurrentBranch();
            } catch (e) {
                console.error("Failed to init workspace", e);
            } finally {
                if (active) dispatch(setIsLoadingInit(false));
            }
        }

        loadRepoEnv();

        async function detectSandbox() {
            const sandboxes = await listSandboxes();
            const matching = sandboxes.find(s => s.repoIds.includes(selectedRepoId));
            if (active && matching) {
                dispatch(setActiveSandbox(matching));
                addLog("info", `Connected to sandbox: ${matching.name}`);
                await setupGitAuth(selectedRepoId, matching.id);
            } else if (active) {
                await setupGitAuth(selectedRepoId);
            }
        }
        detectSandbox();

        return () => { active = false; };
    }, [selectedRepoId, dispatch, addLog, syncCurrentBranch]);

    // Load branch constraints when repo + branch changes
    useEffect(() => {
        if (!selectedRepoId || !selectedBranch || isLoadingInit) return;
        
        let active = true;

        async function loadBranchEnv() {
            try {
                const res = await checkoutBranch(selectedRepoId, selectedBranch);
                
                const isProtectedBranch = isMainProtected && selectedBranch === "main";
                if (isProtectedBranch) {
                    dispatch(setIsTerminalOpen(false));
                } else if (active && isFollowMode) {
                    dispatch(setIsTerminalOpen(true));
                    if (res?.stdout) addLog("stdout", res.stdout);
                    if (res?.stderr && !res.stderr.includes("Already on")) {
                        addLog("stderr", res.stderr);
                    }
                }
                
                if (!active) return;

                const tree = await getRepoFileTree(selectedRepoId);
                if (!active) return;
                dispatch(setFileTree(tree));

                await loadChangedFiles(selectedRepoId);
                refreshGit();
            } catch (e) {
                console.error("Failed branch env setup", e);
            }
        }

        loadBranchEnv();
        return () => { active = false; };
    }, [selectedRepoId, selectedBranch, isLoadingInit, loadChangedFiles, addLog, isFollowMode, isMainProtected, dispatch, refreshGit]);

    const handleRefreshTree = useCallback(async () => {
        if (!selectedRepoId) return;
        const tree = await getRepoFileTree(selectedRepoId);
        dispatch(setFileTree(tree));
        await loadChangedFiles(selectedRepoId);
    }, [selectedRepoId, loadChangedFiles, dispatch]);

    const handleFileSelect = async (path: string) => {
        const existingTab = openTabs.find(t => t.path === path);
        if (existingTab) {
            dispatch(setActiveTabPath(path));
            return;
        }

        try {
            const [content, gitHeadContent, gitIndexContent] = await Promise.all([
                Promise.resolve(getWorkspaceFileContent(selectedRepoId, path)).catch(() => ""),
                Promise.resolve(getGitFileContent(selectedRepoId, path, "HEAD")).catch(() => null),
                Promise.resolve(getGitFileContent(selectedRepoId, path, "")).catch(() => null)
            ]);

            const newTab: Tab = {
                path,
                content,
                originalContent: content,
                gitHeadContent,
                gitIndexContent,
                isDirty: false
            };
            dispatch(addTab(newTab));
        } catch (e) {
            console.error("Failed to read file", e);
            alert("Could not load file");
        }
    };

    const handleSendMessage = async (message: string) => {
        if (!selectedAgentId) {
            alert("Please select an agent first.");
            return;
        }

        if (!selectedRepoId) return;

        setIsChatLoading(true);
        const newUserMessage: ChatMessage = { role: "user", content: message };
        dispatch(addChatMessage(newUserMessage));

        // Add an empty assistant message to stream into
        const assistantMessageIndex = chatMessages.length + 1;
        dispatch(addChatMessage({ role: "assistant", content: "" }));

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    repoId: selectedRepoId,
                    filePath: activeTabPath,
                    prompt: message,
                    agentId: selectedAgentId,
                    history: chatMessages
                })
            });

            if (!response.ok) throw new Error("Failed to start chat");
            if (!response.body) throw new Error("No response body");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedContent = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                accumulatedContent += chunk;
                
                // Update the last assistant message with the accumulated content
                dispatch(updateChatMessage({ 
                    index: assistantMessageIndex, 
                    content: accumulatedContent 
                }));
            }

            // After streaming finishes, parse for suggestions
            const contextData: Record<string, string> = {};
            openTabs.forEach(t => contextData[t.path] = t.content);

            const { suggestion, cleanContent } = parseDiffs(accumulatedContent, activeTabPath, contextData);
            
            // Update with clean content (markers removed)
            dispatch(updateChatMessage({ 
                index: assistantMessageIndex, 
                content: cleanContent 
            }));

            if (suggestion && Object.keys(suggestion.filesChanged).length > 0) {
                dispatch(setPendingSuggestion(suggestion));
                dispatch(setChatTab("suggestions"));

                // Update all affected tab contents that are already open
                (Object.entries(suggestion.filesChanged) as [string, FileChange][]).forEach(([path, change]) => {
                    const isOpen = openTabs.some(t => t.path === path);
                    if (isOpen) {
                        dispatch(updateTabContent({ path, content: change.suggestedContent }));
                    }
                    dispatch(addContextFile(path));
                });
            } else {
                await handleRefreshTree();
            }
        } catch (e) {
            console.error("Chat failed", e);
            alert("Chat failed: " + (e instanceof Error ? e.message : String(e)));
        } finally {
            setIsChatLoading(false);
            await handleRefreshTree();
        }
    };

    const handleApproveSuggestion = async () => {
        if (pendingSuggestion) {
            for (const [path, change] of Object.entries(pendingSuggestion.filesChanged) as [string, FileChange][]) {
                const isOpen = openTabs.some(t => t.path === path);
                if (isOpen) {
                    // Update the editor content first
                    dispatch(updateTabContent({ path, content: change.suggestedContent }));
                    // Then save it
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
            refreshGit();
        }
        dispatch(setPendingSuggestion(null));
        dispatch(setChatTab(null));
    };

    const handleRejectSuggestion = () => {
        if (pendingSuggestion) {
            for (const [path, change] of Object.entries(pendingSuggestion.filesChanged) as [string, FileChange][]) {
                const isOpen = openTabs.some(t => t.path === path);
                if (isOpen) {
                    dispatch(updateTabContent({ path, content: change.originalContent }));
                }
            }
            dispatch(setPendingSuggestion(null));
            dispatch(setChatTab(null));
        }
    };

    const handleTabClose = (path: string) => {
        dispatch(closeTab(path));
    };

    const handleContentChange = (path: string, newContent: string) => {
        dispatch(updateTabContent({ path, content: newContent }));
    };

    const handleSaveFile = async (path: string) => {
        if (savingFiles.current.has(path)) return;

        const tab = openTabs.find(t => t.path === path);
        if (!tab || !tab.isDirty) return;

        savingFiles.current.add(path);

        try {
            await saveWorkspaceFile(selectedRepoId, path, tab.content);
            dispatch(setTabSaved(path));
            await loadChangedFiles(selectedRepoId);
            refreshGit();
        } catch (e) {
            console.error("Failed to save", e);
            alert("Failed to save file");
        } finally {
            savingFiles.current.delete(path);
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
                    const gitHeadContent = await getGitFileContent(selectedRepoId, path, "HEAD");
                    const gitIndexContent = await getGitFileContent(selectedRepoId, path, "");
                    dispatch(revertTab({ path, content, gitHeadContent, gitIndexContent }));
                } else if (res.action === "deleted") {
                    // It was an untracked file and got deleted; close it
                    dispatch(closeTab(path));
                }
                await loadChangedFiles(selectedRepoId);
                refreshGit();
            }
        } catch (e) {
            console.error("Failed to revert file", e);
            alert("Failed to revert file");
        }
    };

    const handleRemoveContext = (path: string) => {
        dispatch(removeContextFile(path));
    };

    const handleAddContext = (path: string) => {
        dispatch(addContextFile(path));
    };

    const getAllFiles = (nodes: FileNode[], prefix = ""): string[] => {
        let files: string[] = [];
        for (const node of nodes) {
            const currentPath = prefix ? `${prefix}/${node.name}` : node.name;
            if (node.type === "file") {
                files.push(currentPath);
            } else if (node.children) {
                files = [...files, ...getAllFiles(node.children, currentPath)];
            }
        }
        return files;
    };

    const handleCreateBranch = async (name: string) => {
        setIsLoadingInit(true);
        if (isFollowMode && !isTerminalOpen) dispatch(setIsTerminalOpen(true));
        if (isFollowMode) addLog("info", `Creating branch: ${name}`);

        try {
            const res = await createBranch(selectedRepoId, name);
            if (isFollowMode) {
                if (res?.stdout) addLog("stdout", res.stdout);
                if (res?.stderr) addLog("stderr", res.stderr);
            }
            const bs = await getRepoBranches(selectedRepoId);
            dispatch(setBranches(bs));
            dispatch(setSelectedBranch(name));
        } catch (e) {
            console.error("Failed to create branch", e);
            alert("Failed to create branch");
        } finally {
            setIsLoadingInit(false);
        }
    };

    const handleCommit = async () => {
        if (!commitMessage.trim()) return;
        setIsCommitting(true);
        
        if (isFollowMode && !isTerminalOpen) dispatch(setIsTerminalOpen(true));
        if (isFollowMode) addLog("info", `Committing: ${commitMessage}`);

        try {
            // Safety Check: Ground truth branch verification
            const branchRes = await getCurrentBranch(selectedRepoId);
            if (branchRes.success && branchRes.branch === "main" && isMainProtected) {
                alert("Cannot commit directly to protected branch 'main'. Please switch branches.");
                await syncCurrentBranch();
                setIsCommitting(false);
                return;
            }

            const res = await commitChanges(selectedRepoId, commitMessage);
            if (res.success) {
                if (isFollowMode) addLog("stdout", res.stdout);
                dispatch(setCommitMessage(""));
                await loadChangedFiles(selectedRepoId);
                refreshGit();
            } else {
                if (isFollowMode) addLog("stderr", res.stderr);
            }
        } catch (e) {
            console.error("Commit failed", e);
        } finally {
            setIsCommitting(false);
        }
    };

    const handlePush = async () => {
        setIsPushing(true);

        if (isFollowMode && !isTerminalOpen) dispatch(setIsTerminalOpen(true));
        if (isFollowMode) addLog("info", `Pushing branch: ${selectedBranch}`);

        try {
            // Safety Check: Ground truth branch verification
            const branchRes = await getCurrentBranch(selectedRepoId);
            if (branchRes.success && branchRes.branch === "main" && isMainProtected) {
                alert("Cannot push directly to protected branch 'main'. Please switch branches.");
                await syncCurrentBranch();
                setIsPushing(false);
                return;
            }

            const res = await pushChanges(selectedRepoId, selectedBranch);
            if (res.success) {
                if (isFollowMode) addLog("stdout", res.stdout);
                refreshGit();
            } else {
                if (isFollowMode) addLog("stderr", res.stderr);
            }
        } catch (e) {
            console.error("Push failed", e);
        } finally {
            setIsPushing(false);
        }
    };

    const handleExecuteCommand = async (command: string) => {
        if (!activeSandbox) return;
        
        dispatch(addTerminalLog({ type: "input", content: command }));
        const repo = repos.find(r => r.id === selectedRepoId);
        
        try {
            const res = await executeSandboxCommand(activeSandbox.id, command, repo?.name);
            if (res.stdout) addLog("stdout", res.stdout);
            if (res.stderr) addLog("stderr", res.stderr);
            
            // Sync branch state after command execution in case user switched branches in terminal
            await syncCurrentBranch();

            if (!res.success && !res.stderr && !res.stdout) {
                 addLog("stderr", "Command failed with no output");
            }
        } catch (e) {
            addLog("stderr", `Error: ${e instanceof Error ? e.message : String(e)}`);
        }
    };
    
    const handleClearLogs = useCallback(() => {
        dispatch(clearTerminalLogs());
    }, [dispatch]);

    const handleStageFile = async (filePath: string) => {
        try {
            await stageFile(selectedRepoId, filePath);
            await loadChangedFiles(selectedRepoId);
            refreshGit();
        } catch (e) {
            console.error("Stage failed", e);
        }
    };

    const handleUnstageFile = async (filePath: string) => {
        try {
            await unstageFile(selectedRepoId, filePath);
            await loadChangedFiles(selectedRepoId);
            refreshGit();
        } catch (e) {
            console.error("Unstage failed", e);
        }
    };

    return (
        <div className="flex flex-col flex-1 h-full bg-background border-t border-border">
            <WorkspaceTopBar
                repos={repos}
                selectedRepoId={selectedRepoId}
                onSelectRepo={(id) => dispatch(setSelectedRepoId(id))}
                branches={branches}
                selectedBranch={selectedBranch}
                onSelectBranch={(branch) => dispatch(setSelectedBranch(branch))}
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
                                    <div className="flex-1 flex flex-col min-h-0">
                                        <div className="px-4 py-2 border-b border-border bg-foreground/[0.03]">
                                            <span className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">Source Control</span>
                                        </div>
                                        
                                        <div className="flex-1 flex flex-col overflow-hidden">
                                            {selectedRepoId ? (
                                                <>
                                                    <div className="p-4 bg-background/50">
                                                        <div className="flex flex-col gap-3">
                                                            <textarea 
                                                                value={commitMessage}
                                                                onChange={(e) => dispatch(setCommitMessage(e.target.value))}
                                                                placeholder="Commit message..."
                                                                className="w-full p-2.5 text-xs bg-foreground/5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[100px] resize-none transition-all placeholder:text-foreground/30"
                                                            />
                                                            <div className="flex gap-2">
                                                                <button 
                                                                    onClick={handleCommit}
                                                                    disabled={isCommitting || !commitMessage.trim() || (isMainProtected && selectedBranch === "main")}
                                                                    className="flex-1 px-3 py-2 text-xs font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98]"
                                                                >
                                                                    {isCommitting ? "Committing..." : (isMainProtected && selectedBranch === "main" ? "Branch Protected" : "Commit")}
                                                                </button>
                                                                <button 
                                                                    onClick={handlePush}
                                                                    disabled={isPushing || (isMainProtected && selectedBranch === "main")}
                                                                    className="px-3 py-2 text-xs font-bold bg-foreground/10 text-foreground rounded-lg hover:bg-foreground/20 disabled:opacity-50 transition-all active:scale-[0.98] flex items-center gap-2"
                                                                    title="Push Changes"
                                                                >
                                                                    {isPushing ? (
                                                                        <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
                                                                    ) : (
                                                                        <>
                                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                                                                <polyline points="17 8 12 3 7 8"></polyline>
                                                                                <line x1="12" y1="3" x2="12" y2="15"></line>
                                                                            </svg>
                                                                            {isMainProtected && selectedBranch === "main" && "Push Protected"}
                                                                        </>
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex-1 min-h-0 px-4 pb-4 overflow-hidden flex flex-col">
                                                        <GitLog repoId={selectedRepoId} refreshTrigger={gitRefreshKey} />
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex-1 flex items-center justify-center p-8 text-center text-foreground/40 text-xs italic">
                                                    Select a repository to view source control actions
                                                </div>
                                            )}
                                        </div>
                                    </div>
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
                                            onExecute={handleExecuteCommand}
                                            isSandboxConnected={!!activeSandbox}
                                            sandboxName={activeSandbox?.name}
                                            isFollowMode={isFollowMode}
                                            onToggleFollow={() => dispatch(setIsFollowMode(!isFollowMode))}
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
