import { useState, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
    setBranches,
    setSelectedBranch,
    setIsLoadingInit,
} from "@/lib/store/features/workspace/workspaceSlice";
import {
    setIsTerminalOpen,
} from "@/lib/store/features/terminal/terminalSlice";
import {
    getRepoBranches,
    createBranch,
    commitChanges,
    pushChanges,
    stageFile,
    unstageFile,
    getCurrentBranch,
} from "@/app/actions/git";

export function useGitOperations(
    loadChangedFiles: (repoId: string) => Promise<void>,
    syncCurrentBranch: () => Promise<void>,
    addLog: (type: "input" | "stdout" | "stderr" | "info", content: string) => void
) {
    const dispatch = useAppDispatch();
    const selectedRepoId = useAppSelector((state) => state.workspace.selectedRepoId);
    const selectedBranch = useAppSelector((state) => state.workspace.selectedBranch);
    const isMainProtected = useAppSelector((state) => state.workspace.isMainProtected);
    const isFollowMode = useAppSelector((state) => state.terminal.isFollowMode);
    const isTerminalOpen = useAppSelector((state) => state.terminal.isTerminalOpen);

    const [commitMessage, setCommitMessage] = useState("");
    const [isPushing, setIsPushing] = useState(false);
    const [isCommitting, setIsCommitting] = useState(false);
    const [gitRefreshKey, setGitRefreshKey] = useState(0);

    const refreshGit = useCallback(() => setGitRefreshKey(prev => prev + 1), []);

    const handleCreateBranch = useCallback(async (name: string) => {
        if (!selectedRepoId) return;
        dispatch(setIsLoadingInit(true));
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
            dispatch(setIsLoadingInit(false));
        }
    }, [selectedRepoId, isFollowMode, isTerminalOpen, addLog, dispatch]);

    const handleCommit = useCallback(async () => {
        if (!selectedRepoId || !commitMessage.trim()) return;
        setIsCommitting(true);
        
        if (isFollowMode && !isTerminalOpen) dispatch(setIsTerminalOpen(true));
        if (isFollowMode) addLog("info", `Committing: ${commitMessage}`);

        try {
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
    }, [selectedRepoId, commitMessage, isFollowMode, isTerminalOpen, isMainProtected, addLog, loadChangedFiles, refreshGit, syncCurrentBranch, dispatch]);

    const handlePush = useCallback(async () => {
        if (!selectedRepoId || !selectedBranch) return;
        setIsPushing(true);

        if (isFollowMode && !isTerminalOpen) dispatch(setIsTerminalOpen(true));
        if (isFollowMode) addLog("info", `Pushing branch: ${selectedBranch}`);

        try {
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
    }, [selectedRepoId, selectedBranch, isFollowMode, isTerminalOpen, isMainProtected, addLog, refreshGit, syncCurrentBranch, dispatch]);

    const handleStageFile = useCallback(async (filePath: string) => {
        if (!selectedRepoId) return;
        try {
            await stageFile(selectedRepoId, filePath);
            await loadChangedFiles(selectedRepoId);
            refreshGit();
        } catch (e) {
            console.error("Stage failed", e);
        }
    }, [selectedRepoId, loadChangedFiles, refreshGit]);

    const handleUnstageFile = useCallback(async (filePath: string) => {
        if (!selectedRepoId) return;
        try {
            await unstageFile(selectedRepoId, filePath);
            await loadChangedFiles(selectedRepoId);
            refreshGit();
        } catch (e) {
            console.error("Unstage failed", e);
        }
    }, [selectedRepoId, loadChangedFiles, refreshGit]);

    return {
        commitMessage,
        setCommitMessage,
        isPushing,
        isCommitting,
        gitRefreshKey,
        refreshGit,
        handleCreateBranch,
        handleCommit,
        handlePush,
        handleStageFile,
        handleUnstageFile,
    };
}
