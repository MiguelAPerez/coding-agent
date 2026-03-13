import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
    addTerminalLog,
    setIsFollowMode,
    clearTerminalLogs,
} from "@/lib/store/features/terminal/terminalSlice";
import {
    executeSandboxCommand,
} from "@/app/actions/docker-sandboxes";

export function useTerminalExecution(
    syncCurrentBranch: () => Promise<void>,
    addLog: (type: "input" | "stdout" | "stderr" | "info", content: string) => void
) {
    const dispatch = useAppDispatch();
    const activeSandbox = useAppSelector((state) => state.terminal.activeSandbox);
    const terminalLogs = useAppSelector((state) => state.terminal.terminalLogs);
    const isFollowMode = useAppSelector((state) => state.terminal.isFollowMode);

    const handleExecuteCommand = useCallback(async (command: string, repoName?: string) => {
        if (!activeSandbox) return;
        
        dispatch(addTerminalLog({ type: "input", content: command }));
        
        try {
            const res = await executeSandboxCommand(activeSandbox.id, command, repoName);
            if (res.stdout) addLog("stdout", res.stdout);
            if (res.stderr) addLog("stderr", res.stderr);
            
            await syncCurrentBranch();

            if (!res.success && !res.stderr && !res.stdout) {
                 addLog("stderr", "Command failed with no output");
            }
        } catch (e) {
            addLog("stderr", `Error: ${e instanceof Error ? e.message : String(e)}`);
        }
    }, [activeSandbox, addLog, syncCurrentBranch, dispatch]);
    
    const handleClearLogs = useCallback(() => {
        dispatch(clearTerminalLogs());
    }, [dispatch]);

    const toggleFollowMode = useCallback(() => {
        dispatch(setIsFollowMode(!isFollowMode));
    }, [isFollowMode, dispatch]);

    return {
        terminalLogs,
        isFollowMode,
        handleExecuteCommand,
        handleClearLogs,
        toggleFollowMode,
    };
}
