import { useCallback, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
    setActiveTabPath,
    addTab,
    closeTab,
    updateTabContent,
    setTabSaved,
    revertTab,
    setChangedFiles,
} from "@/lib/store/features/workspace/workspaceSlice";
import {
    getWorkspaceFileContent,
    saveWorkspaceFile,
    getWorkspaceChangedFiles,
    getGitFileContent,
    revertWorkspaceFile,
} from "@/app/actions/workspace-files";

export interface Tab {
    path: string;
    content: string;
    originalContent: string;
    gitHeadContent: string | null;
    gitIndexContent: string | null;
    isDirty: boolean;
}

export function useFileManagement() {
    const dispatch = useAppDispatch();
    const selectedRepoId = useAppSelector((state) => state.workspace.selectedRepoId);
    const openTabs = useAppSelector((state) => state.workspace.openTabs);
    const activeTabPath = useAppSelector((state) => state.workspace.activeTabPath);
    const savingFiles = useRef<Set<string>>(new Set());

    const loadChangedFiles = useCallback(async (repoId: string) => {
        const changes = await getWorkspaceChangedFiles(repoId);
        dispatch(setChangedFiles(changes));
    }, [dispatch]);

    const handleFileSelect = useCallback(async (path: string) => {
        if (!selectedRepoId) return;
        
        const existingTab = openTabs.find((t: Tab) => t.path === path);
        if (existingTab) {
            dispatch(setActiveTabPath(path));
            return;
        }

        try {
            const [content, gitHeadContent, gitIndexContent] = await Promise.all([
                getWorkspaceFileContent(selectedRepoId, path).catch(() => ""),
                getGitFileContent(selectedRepoId, path, "HEAD").catch(() => null),
                getGitFileContent(selectedRepoId, path, "").catch(() => null)
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
    }, [selectedRepoId, openTabs, dispatch]);

    const handleTabClose = useCallback((path: string) => {
        dispatch(closeTab(path));
    }, [dispatch]);

    const handleContentChange = useCallback((path: string, newContent: string) => {
        dispatch(updateTabContent({ path, content: newContent }));
    }, [dispatch]);

    const handleSaveFile = useCallback(async (path: string) => {
        if (!selectedRepoId || savingFiles.current.has(path)) return;

        const tab = openTabs.find((t: Tab) => t.path === path);
        if (!tab || !tab.isDirty) return;

        savingFiles.current.add(path);

        try {
            await saveWorkspaceFile(selectedRepoId, path, tab.content);
            dispatch(setTabSaved(path));
            await loadChangedFiles(selectedRepoId);
        } catch (e) {
            console.error("Failed to save", e);
            alert("Failed to save file");
        } finally {
            savingFiles.current.delete(path);
        }
    }, [selectedRepoId, openTabs, dispatch, loadChangedFiles]);

    const handleRevertFile = useCallback(async (path: string) => {
        if (!selectedRepoId) return;
        if (!confirm(`Are you sure you want to revert changes to ${path}?`)) return;

        try {
            const res = await revertWorkspaceFile(selectedRepoId, path);
            if (res.success) {
                if (res.action === "restored") {
                    const content = await getWorkspaceFileContent(selectedRepoId, path);
                    const gitHeadContent = await getGitFileContent(selectedRepoId, path, "HEAD");
                    const gitIndexContent = await getGitFileContent(selectedRepoId, path, "");
                    dispatch(revertTab({ path, content, gitHeadContent, gitIndexContent }));
                } else if (res.action === "deleted") {
                    dispatch(closeTab(path));
                }
                await loadChangedFiles(selectedRepoId);
            }
        } catch (e) {
            console.error("Failed to revert file", e);
            alert("Failed to revert file");
        }
    }, [selectedRepoId, dispatch, loadChangedFiles]);

    return {
        openTabs,
        activeTabPath,
        handleFileSelect,
        handleTabClose,
        handleContentChange,
        handleSaveFile,
        handleRevertFile,
        loadChangedFiles,
    };
}
