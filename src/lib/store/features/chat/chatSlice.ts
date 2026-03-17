import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ChatMessage, PendingSuggestion, TechnicalPlan, PlanStep } from "@/lib/chat/types";

interface ChatState {
    chatMessages: ChatMessage[];
    repositories: { id: string; fullName: string }[];
    selectedRepoId: string | null;
    agents: { id: string; name: string }[];
    selectedAgentId: string;
    pendingSuggestion: PendingSuggestion | null;
    technicalPlan: TechnicalPlan | null;
    chatTab: "context" | "suggestions" | "plan" | null;
    contextFiles: string[];
    loadingChatIds: string[];
}

const initialState: ChatState = {
    chatMessages: [],
    repositories: [],
    selectedRepoId: null,
    agents: [],
    selectedAgentId: "",
    pendingSuggestion: null,
    technicalPlan: null,
    chatTab: null,
    contextFiles: [],
    loadingChatIds: [],
};

export const chatSlice = createSlice({
    name: "chat",
    initialState,
    reducers: {
        setChatMessages: (state, action: PayloadAction<ChatMessage[]>) => {
            state.chatMessages = action.payload;
        },
        addChatMessage: (state, action: PayloadAction<ChatMessage>) => {
            state.chatMessages.push(action.payload);
        },
        setAgents: (state, action: PayloadAction<{ id: string; name: string }[]>) => {
            state.agents = action.payload;
            if (state.agents.length > 0 && !state.selectedAgentId) {
                state.selectedAgentId = state.agents[0].id;
            }
        },
        setSelectedAgentId: (state, action: PayloadAction<string>) => {
            state.selectedAgentId = action.payload;
        },
        setPendingSuggestion: (state, action: PayloadAction<PendingSuggestion | null>) => {
            state.pendingSuggestion = action.payload;
        },
        setTechnicalPlan: (state, action: PayloadAction<TechnicalPlan | null>) => {
            state.technicalPlan = action.payload;
            if (action.payload) {
                state.chatTab = "plan";
            }
        },
        updatePlanStepStatus: (state, action: PayloadAction<{ file: string; status: PlanStep["status"] }>) => {
            if (state.technicalPlan) {
                const step = state.technicalPlan.steps.find(s => s.file === action.payload.file);
                if (step) {
                    step.status = action.payload.status;
                }
            }
        },
        setChatTab: (state, action: PayloadAction<"context" | "suggestions" | "plan" | null>) => {
            state.chatTab = action.payload;
        },
        setContextFiles: (state, action: PayloadAction<string[]>) => {
            state.contextFiles = action.payload;
        },
        addContextFile: (state, action: PayloadAction<string>) => {
            if (!state.contextFiles.includes(action.payload)) {
                state.contextFiles.push(action.payload);
            }
        },
        removeContextFile: (state, action: PayloadAction<string>) => {
            state.contextFiles = state.contextFiles.filter(f => f !== action.payload);
        },
        updateChatMessage: (state, action: PayloadAction<{ index: number; content: string }>) => {
            if (state.chatMessages[action.payload.index]) {
                state.chatMessages[action.payload.index].content = action.payload.content;
            }
        },
        updateChatMessageById: (state, action: PayloadAction<{ id: string; content: string; thinking?: string; append?: boolean }>) => {
            const msg = state.chatMessages.find(m => m.id === action.payload.id);
            if (msg) {
                if (action.payload.append) {
                    msg.content += action.payload.content;
                } else {
                    msg.content = action.payload.content;
                }
                if (action.payload.thinking !== undefined) {
                    msg.thinking = action.payload.thinking;
                }
            }
        },
        setRepositories: (state, action: PayloadAction<{ id: string; fullName: string }[]>) => {
            state.repositories = action.payload;
        },
        setSelectedRepoId: (state, action: PayloadAction<string | null>) => {
            state.selectedRepoId = action.payload;
        },
        clearChat: (state) => {
            state.chatMessages = [];
            state.pendingSuggestion = null;
            state.technicalPlan = null;
            state.chatTab = null;
            state.contextFiles = [];
            state.selectedRepoId = null;
            state.loadingChatIds = [];
        },
        addLoadingChatId: (state, action: PayloadAction<string>) => {
            if (!state.loadingChatIds.includes(action.payload)) {
                state.loadingChatIds.push(action.payload);
            }
        },
        removeLoadingChatId: (state, action: PayloadAction<string>) => {
            state.loadingChatIds = state.loadingChatIds.filter(id => id !== action.payload);
        }
    },
});

export const {
    setChatMessages,
    addChatMessage,
    setAgents,
    setSelectedAgentId,
    setPendingSuggestion,
    setTechnicalPlan,
    updatePlanStepStatus,
    setChatTab,
    setContextFiles,
    addContextFile,
    removeContextFile,
    clearChat,
    updateChatMessage,
    updateChatMessageById,
    setRepositories,
    setSelectedRepoId,
    addLoadingChatId,
    removeLoadingChatId
} = chatSlice.actions;

export default chatSlice.reducer;
