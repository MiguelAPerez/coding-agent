import { configureStore } from "@reduxjs/toolkit";
import workspaceReducer from "./features/workspace/workspaceSlice";
import chatReducer from "./features/chat/chatSlice";
import terminalReducer from "./features/terminal/terminalSlice";

export const makeStore = () => {
    return configureStore({
        reducer: {
            workspace: workspaceReducer,
            chat: chatReducer,
            terminal: terminalReducer,
        },
    });
};

export const store = makeStore();

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
