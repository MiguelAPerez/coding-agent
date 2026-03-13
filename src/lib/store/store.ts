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

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
