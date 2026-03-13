import { useEffect, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
    setBranches,
    setSelectedBranch,
    setIsLoadingInit,
    setIsMainProtected,
} from "@/lib/store/features/workspace/workspaceSlice";
import { setAgents, setSelectedAgentId, clearChat } from "@/lib/store/features/chat/chatSlice";
import {
    addTerminalLog,
    clearTerminalLogs,
    setActiveSandbox,
} from "@/lib/store/features/terminal/terminalSlice";
import { initWorkspace } from "@/app/actions/workspace";
import { listSandboxes } from "@/app/actions/docker-sandboxes";
import { getRepoBranches, setupGitAuth, getCurrentBranch } from "@/app/actions/git";
import { getAgentConfigs } from "@/app/actions/config";
import { getBranchProtection } from "@/app/actions/settings";

export function useWorkspaceInit() {
    const dispatch = useAppDispatch();
    const selectedRepoId = useAppSelector((state) => state.workspace.selectedRepoId);
    const selectedBranch = useAppSelector((state) => state.workspace.selectedBranch);
    const isLoadingInit = useAppSelector((state) => state.workspace.isLoadingInit);
    const selectedAgentId = useAppSelector((state) => state.chat.selectedAgentId);

    const addLog = useCallback((type: "input" | "stdout" | "stderr" | "info", content: string) => {
        dispatch(addTerminalLog({ type, content }));
    }, [dispatch]);

    const syncCurrentBranch = useCallback(async () => {
        if (!selectedRepoId) return;
        const res = await getCurrentBranch(selectedRepoId);
        if (res.success) {
            if (selectedBranch !== res.branch) {
                dispatch(setSelectedBranch(res.branch));
            }
        }
    }, [selectedRepoId, selectedBranch, dispatch]);

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

    // Clear state when repo changes
    useEffect(() => {
        if (!selectedRepoId) return;
        dispatch(clearTerminalLogs());
        dispatch(setActiveSandbox(null));
        dispatch(clearChat());
    }, [selectedRepoId, dispatch]);

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
            if (matching) {
                dispatch(setActiveSandbox(matching));
                addLog("info", `Connected to sandbox: ${matching.name}`);
                await setupGitAuth(selectedRepoId, matching.id);
            } else {
                await setupGitAuth(selectedRepoId);
            }
        }
        detectSandbox();

        return () => { active = false; };
    }, [selectedRepoId, dispatch, addLog, syncCurrentBranch]);

    return { isLoadingInit, syncCurrentBranch, addLog };
}
