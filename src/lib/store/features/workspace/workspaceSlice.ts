import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { FileNode } from "@/app/actions/workspace-files";

export interface Tab {
    path: string;
    content: string;
    originalContent: string;
    gitHeadContent: string | null;
    gitIndexContent: string | null;
    isDirty: boolean;
}

interface WorkspaceState {
    selectedRepoId: string;
    branches: string[];
    selectedBranch: string;
    fileTree: FileNode[];
    openTabs: Tab[];
    activeTabPath: string | null;
    changedFiles: { path: string; status: string }[];
    isLoadingInit: boolean;
    isMainProtected: boolean;
    activeLeftTab: "files" | "git";
    commitMessage: string;
}

const initialState: WorkspaceState = {
    selectedRepoId: "",
    branches: [],
    selectedBranch: "main",
    fileTree: [],
    openTabs: [],
    activeTabPath: null,
    changedFiles: [],
    isLoadingInit: false,
    isMainProtected: true,
    activeLeftTab: "files",
    commitMessage: "",
};

export const workspaceSlice = createSlice({
    name: "workspace",
    initialState,
    reducers: {
        setSelectedRepoId: (state, action: PayloadAction<string>) => {
            state.selectedRepoId = action.payload;
            // Clear repo-specific state
            state.openTabs = [];
            state.activeTabPath = null;
            state.fileTree = [];
            state.branches = [];
            state.selectedBranch = "main";
            state.changedFiles = [];
        },
        setBranches: (state, action: PayloadAction<string[]>) => {
            state.branches = action.payload;
        },
        setSelectedBranch: (state, action: PayloadAction<string>) => {
            state.selectedBranch = action.payload;
        },
        setFileTree: (state, action: PayloadAction<FileNode[]>) => {
            state.fileTree = action.payload;
        },
        setOpenTabs: (state, action: PayloadAction<Tab[]>) => {
            state.openTabs = action.payload;
        },
        setActiveTabPath: (state, action: PayloadAction<string | null>) => {
            state.activeTabPath = action.payload;
        },
        setChangedFiles: (state, action: PayloadAction<{ path: string; status: string }[]>) => {
            state.changedFiles = action.payload;
        },
        setIsLoadingInit: (state, action: PayloadAction<boolean>) => {
            state.isLoadingInit = action.payload;
        },
        setIsMainProtected: (state, action: PayloadAction<boolean>) => {
            state.isMainProtected = action.payload;
        },
        setActiveLeftTab: (state, action: PayloadAction<"files" | "git">) => {
            state.activeLeftTab = action.payload;
        },
        updateTabContent: (state, action: PayloadAction<{ path: string; content: string }>) => {
            const tab = state.openTabs.find(t => t.path === action.payload.path);
            if (tab) {
                tab.content = action.payload.content;
                tab.isDirty = tab.content !== tab.originalContent;
            }
        },
        addTab: (state, action: PayloadAction<Tab>) => {
            if (!state.openTabs.some(t => t.path === action.payload.path)) {
                state.openTabs.push(action.payload);
            }
            state.activeTabPath = action.payload.path;
        },
        closeTab: (state, action: PayloadAction<string>) => {
            state.openTabs = state.openTabs.filter(t => t.path !== action.payload);
            if (state.activeTabPath === action.payload) {
                state.activeTabPath = state.openTabs.length > 0 
                    ? state.openTabs[state.openTabs.length - 1].path 
                    : null;
            }
        },
        setTabSaved: (state, action: PayloadAction<string>) => {
            const tab = state.openTabs.find(t => t.path === action.payload);
            if (tab) {
                tab.originalContent = tab.content;
                tab.isDirty = false;
            }
        },
        revertTab: (state, action: PayloadAction<{ path: string; content: string; gitHeadContent: string | null; gitIndexContent: string | null }>) => {
            const tab = state.openTabs.find(t => t.path === action.payload.path);
            if (tab) {
                tab.content = action.payload.content;
                tab.originalContent = action.payload.content;
                tab.gitHeadContent = action.payload.gitHeadContent;
                tab.gitIndexContent = action.payload.gitIndexContent;
                tab.isDirty = false;
            }
        },
        setCommitMessage: (state, action: PayloadAction<string>) => {
            state.commitMessage = action.payload;
        }
    },
});

export const {
    setSelectedRepoId,
    setBranches,
    setSelectedBranch,
    setFileTree,
    setOpenTabs,
    setActiveTabPath,
    setChangedFiles,
    setIsLoadingInit,
    setIsMainProtected,
    setActiveLeftTab,
    updateTabContent,
    addTab,
    closeTab,
    setTabSaved,
    revertTab,
    setCommitMessage
} = workspaceSlice.actions;

export default workspaceSlice.reducer;
