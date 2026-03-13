"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";
import WorkspaceTopBar from "./components/WorkspaceTopBar";
import FileTree from "./components/FileTree";
import EditorArea from "./components/EditorArea";
import ChatPanel from "./components/ChatPanel";
import Terminal from "./components/Terminal";
import GitLog from "./components/GitLog";

import { initWorkspace } from "@/app/actions/workspace";
import { 
    listSandboxes, 
    executeSandboxCommand,
    SandboxInfo 
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
    getRepoFileTree,
    getWorkspaceFileContent,
    saveWorkspaceFile,
    getWorkspaceChangedFiles,
    getGitFileContent,
    revertWorkspaceFile,
    FileNode
} from "@/app/actions/workspace-files";
import { getBranchProtection } from "@/app/actions/settings";


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

export interface Tab {
    path: string;
    content: string;
    originalContent: string;
    gitHeadContent: string | null;
    isDirty: boolean;
}

interface LogEntry {
    type: "input" | "stdout" | "stderr" | "info";
    content: string;
    timestamp: number;
}

export default function WorkspaceClient({ initialRepos }: { initialRepos: Repo[] }) {
    const [repos] = useState<Repo[]>(initialRepos);
    const [selectedRepoId, setSelectedRepoId] = useState<string>("");
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

    const [commitMessage, setCommitMessage] = useState("");
    const [isPushing, setIsPushing] = useState(false);
    const [isCommitting, setIsCommitting] = useState(false);

    // Terminal State
    const [isTerminalOpen, setIsTerminalOpen] = useState(false);
    const [terminalLogs, setTerminalLogs] = useState<LogEntry[]>([]);
    const [isFollowMode, setIsFollowMode] = useState(true);
    const [activeSandbox, setActiveSandbox] = useState<SandboxInfo | null>(null);

    const [isLoadingInit, setIsLoadingInit] = useState(false);
    const [isMainProtected, setIsMainProtected] = useState(true);
    const [gitRefreshKey, setGitRefreshKey] = useState(0);
    const [activeLeftTab, setActiveLeftTab] = useState<"files" | "git">("files");
    const savingFiles = useRef<Set<string>>(new Set());

    const refreshGit = useCallback(() => setGitRefreshKey(prev => prev + 1), []);

    const syncCurrentBranch = useCallback(async () => {
        if (!selectedRepoId) return;
        const res = await getCurrentBranch(selectedRepoId);
        if (res.success) {
            setSelectedBranch(current => current !== res.branch ? res.branch : current);
        }
    }, [selectedRepoId]);

    const loadChangedFiles = useCallback(async (repoId: string) => {
        const changes = await getWorkspaceChangedFiles(repoId);
        setChangedFiles(changes);
    }, []);

    const addLog = useCallback((type: LogEntry["type"], content: string) => {
        setTerminalLogs(prev => [...prev, { type, content, timestamp: Date.now() }]);
    }, []);

    // Clear state when repo changes
    useEffect(() => {
        setOpenTabs([]);
        setActiveTabPath(null);
        setContextFiles([]);
        setPendingSuggestion(null);
        setChatTab(null);
        setFileTree([]);
        setBranches([]);
        setSelectedBranch("main");
        
        // Reset terminal logs when repo changes? Maybe keep them?
        // Let's reset for now to keep it clean per repo.
        setTerminalLogs([]);
        setActiveSandbox(null);
    }, [selectedRepoId]);

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

                const protection = await getBranchProtection();
                if (active) setIsMainProtected(protection);
                
                await syncCurrentBranch();
            } catch (e) {
                console.error("Failed to init workspace", e);
            } finally {
                if (active) setIsLoadingInit(false);
            }
        }

        loadRepoEnv();

        // Detect sandbox for this repo
        async function detectSandbox() {
            const sandboxes = await listSandboxes();
            const matching = sandboxes.find(s => s.repoIds.includes(selectedRepoId));
            if (matching) {
                setActiveSandbox(matching);
                addLog("info", `Connected to sandbox: ${matching.name}`);
                // Setup Git Auth for the sandbox
                await setupGitAuth(selectedRepoId, matching.id);
            } else {
                // If no sandbox, still setup git auth for local workspace
                await setupGitAuth(selectedRepoId);
            }
        }
        detectSandbox();

        return () => { active = false; };
    }, [selectedRepoId, addLog, syncCurrentBranch]);

    // Load branch constraints when repo + branch changes
    useEffect(() => {
        if (!selectedRepoId || !selectedBranch || isLoadingInit) return;
        let active = true;

        async function loadBranchEnv() {
            try {
                const res = await checkoutBranch(selectedRepoId, selectedBranch);
                const isProtectedBranch = isMainProtected && selectedBranch === "main";
                if (isProtectedBranch) {
                    setIsTerminalOpen(false);
                } else if (active && isFollowMode) {
                    if (!isTerminalOpen) setIsTerminalOpen(true);
                    // Only log if it's NOT a redundant "Already on..." tip
                    if (res?.stdout) addLog("stdout", res.stdout);
                    if (res?.stderr && !res.stderr.includes("Already on")) {
                        addLog("stderr", res.stderr);
                    }
                }
                
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
        refreshGit();
        // optionally clear tabs on branch switch
        return () => { active = false; };
        // We omit isTerminalOpen to avoid re-triggering when we auto-open it
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedRepoId, selectedBranch, isLoadingInit, loadChangedFiles, addLog, isFollowMode, isMainProtected]);

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
            refreshGit();
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
        if (savingFiles.current.has(path)) return;

        const tab = openTabs.find(t => t.path === path);
        if (!tab || !tab.isDirty) return;

        savingFiles.current.add(path);

        try {
            await saveWorkspaceFile(selectedRepoId, path, tab.content);
            setOpenTabs(prev => prev.map(t => {
                if (t.path === path) {
                    return { ...t, originalContent: t.content, isDirty: false };
                }
                return t;
            }));
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
                refreshGit();
            }
        } catch (e) {
            console.error("Failed to revert file", e);
            alert("Failed to revert file");
        }
    };

    const handleRemoveContext = (path: string) => {
        setContextFiles(prev => prev.filter(p => p !== path));
    };

    const handleCreateBranch = async (name: string) => {
        setIsLoadingInit(true);
        if (isFollowMode && !isTerminalOpen) setIsTerminalOpen(true);
        if (isFollowMode) addLog("info", `Creating branch: ${name}`);

        try {
            const res = await createBranch(selectedRepoId, name);
            if (isFollowMode) {
                if (res?.stdout) addLog("stdout", res.stdout);
                if (res?.stderr) addLog("stderr", res.stderr);
            }
            const bs = await getRepoBranches(selectedRepoId);
            setBranches(bs);
            setSelectedBranch(name);
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
        
        if (isFollowMode && !isTerminalOpen) setIsTerminalOpen(true);
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
                setCommitMessage("");
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

        if (isFollowMode && !isTerminalOpen) setIsTerminalOpen(true);
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
        
        addLog("input", command);
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
        setTerminalLogs([]);
    }, []);

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
                onSelectRepo={setSelectedRepoId}
                branches={branches}
                selectedBranch={selectedBranch}
                onSelectBranch={setSelectedBranch}
                onCreateBranch={handleCreateBranch}
                isTerminalOpen={isTerminalOpen}
                onToggleTerminal={() => setIsTerminalOpen(!isTerminalOpen)}
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
                                    onClick={() => setActiveLeftTab("files")}
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
                                    onClick={() => setActiveLeftTab("git")}
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
                                                                onChange={(e) => setCommitMessage(e.target.value)}
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
                        <PanelGroup orientation="vertical">
                            <Panel defaultSize={70} minSize={40}>
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
                                            onToggleFollow={() => setIsFollowMode(!isFollowMode)}
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
                                onTabChange={setChatTab}
                            />
                    </Panel>
                </PanelGroup>
            </div>
        </div>
    );
}
