"use client";

import { useState } from "react";
import { Provider } from "react-redux";
import { makeStore } from "./store";

export function ReduxProvider({ children }: { children: React.ReactNode }) {
    const [store] = useState(() => makeStore());
    return <Provider store={store}>{children}</Provider>;
}
