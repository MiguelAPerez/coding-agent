import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { SandboxInfo } from "@/app/actions/docker-sandboxes";

export interface LogEntry {
    type: "input" | "stdout" | "stderr" | "info";
    content: string;
    timestamp: number;
}

interface TerminalState {
    terminalLogs: LogEntry[];
    isTerminalOpen: boolean;
    isFollowMode: boolean;
    activeSandbox: SandboxInfo | null;
}

const initialState: TerminalState = {
    terminalLogs: [],
    isTerminalOpen: false,
    isFollowMode: true,
    activeSandbox: null,
};

export const terminalSlice = createSlice({
    name: "terminal",
    initialState,
    reducers: {
        setTerminalLogs: (state, action: PayloadAction<LogEntry[]>) => {
            state.terminalLogs = action.payload;
        },
        addTerminalLog: (state, action: PayloadAction<{ type: LogEntry["type"]; content: string }>) => {
            state.terminalLogs.push({
                type: action.payload.type,
                content: action.payload.content,
                timestamp: Date.now(),
            });
        },
        setIsTerminalOpen: (state, action: PayloadAction<boolean>) => {
            state.isTerminalOpen = action.payload;
        },
        setIsFollowMode: (state, action: PayloadAction<boolean>) => {
            state.isFollowMode = action.payload;
        },
        setActiveSandbox: (state, action: PayloadAction<SandboxInfo | null>) => {
            state.activeSandbox = action.payload;
        },
        clearTerminalLogs: (state) => {
            state.terminalLogs = [];
        }
    },
});

export const {
    setTerminalLogs,
    addTerminalLog,
    setIsTerminalOpen,
    setIsFollowMode,
    setActiveSandbox,
    clearTerminalLogs
} = terminalSlice.actions;

export default terminalSlice.reducer;
