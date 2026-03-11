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
    getWorkspaceChangedFiles
} from "@/app/actions/workspace";

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
    const [changedFiles, setChangedFiles] = useState<{path: string, status: string}[]>([]);
    
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
            const content = await getWorkspaceFileContent(selectedRepoId, path);
            const newTab: Tab = {
                path,
                content,
                originalContent: content,
                isDirty: false
            };
            setOpenTabs(prev => [...prev, newTab]);
            setActiveTabPath(path);
        } catch (e) {
            console.error("Failed to read file", e);
            alert("Could not load file");
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
                        <FileTree tree={fileTree} onSelectFile={handleFileSelect} />
                    </Panel>
                    
                    <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors" />
                    
                    <Panel minSize={30}>
                        <EditorArea 
                            tabs={openTabs}
                            activeTabPath={activeTabPath}
                            onTabSelect={setActiveTabPath}
                            onTabClose={handleTabClose}
                            onContentChange={handleContentChange}
                            onSaveFile={handleSaveFile}
                        />
                    </Panel>
                    
                    <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors" />
                    
                    <Panel defaultSize={25} minSize={15} className="border-l border-border bg-foreground/[0.02]">
                        <ChatPanel changedFiles={changedFiles} />
                    </Panel>
                </PanelGroup>
            </div>
        </div>
    );
}
