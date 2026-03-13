import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ChatMessage, PendingSuggestion } from "@/app/actions/chat";

interface ChatState {
    chatMessages: ChatMessage[];
    agents: { id: string; name: string }[];
    selectedAgentId: string;
    pendingSuggestion: PendingSuggestion | null;
    chatTab: "context" | "suggestions" | null;
    contextFiles: string[];
}

const initialState: ChatState = {
    chatMessages: [],
    agents: [],
    selectedAgentId: "",
    pendingSuggestion: null,
    chatTab: null,
    contextFiles: [],
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
        setChatTab: (state, action: PayloadAction<"context" | "suggestions" | null>) => {
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
        clearChat: (state) => {
            state.chatMessages = [];
            state.pendingSuggestion = null;
            state.chatTab = null;
            state.contextFiles = [];
        }
    },
});

export const {
    setChatMessages,
    addChatMessage,
    setAgents,
    setSelectedAgentId,
    setPendingSuggestion,
    setChatTab,
    setContextFiles,
    addContextFile,
    removeContextFile,
    clearChat
} = chatSlice.actions;

export default chatSlice.reducer;
