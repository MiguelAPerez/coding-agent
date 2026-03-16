/* eslint-disable @typescript-eslint/no-explicit-any */
import reducer, {
    setChatMessages,
    addChatMessage,
    updateChatMessageById,
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
    setRepositories,
    setSelectedRepoId
} from "../chatSlice";

describe("chatSlice", () => {
    const initialState = {
        chatMessages: [],
        repositories: [],
        selectedRepoId: null,
        agents: [],
        selectedAgentId: "",
        pendingSuggestion: null,
        technicalPlan: null,
        chatTab: null,
        contextFiles: [],
    };

    test("should return the initial state", () => {
        expect(reducer(undefined, { type: "unknown" })).toEqual(initialState);
    });

    test("should handle setChatMessages", () => {
        const messages = [{ role: "user", content: "hello" }];
        const actual = reducer(initialState, setChatMessages(messages as any));
        expect(actual.chatMessages).toEqual(messages);
    });

    test("should handle addChatMessage", () => {
        const message = { role: "assistant", content: "hi" };
        const actual = reducer(initialState, addChatMessage(message as any));
        expect(actual.chatMessages).toHaveLength(1);
        expect(actual.chatMessages[0]).toEqual(message);
    });

    test("should handle setAgents and auto-select first agent", () => {
        const agents = [{ id: "1", name: "Agent 1" }, { id: "2", name: "Agent 2" }];
        const actual = reducer(initialState, setAgents(agents));
        expect(actual.agents).toEqual(agents);
        expect(actual.selectedAgentId).toBe("1");
    });

    test("should handle setSelectedAgentId", () => {
        const actual = reducer(initialState, setSelectedAgentId("agent-123"));
        expect(actual.selectedAgentId).toBe("agent-123");
    });

    test("should handle setPendingSuggestion", () => {
        const suggestion = { id: "s-1", filesChanged: {} };
        const actual = reducer(initialState, setPendingSuggestion(suggestion as any));
        expect(actual.pendingSuggestion).toEqual(suggestion);
    });

    test("should handle setTechnicalPlan and switch tab", () => {
        const plan = { steps: [] };
        const actual = reducer(initialState, setTechnicalPlan(plan as any));
        expect(actual.technicalPlan).toEqual(plan);
        expect(actual.chatTab).toBe("plan");
    });

    test("should handle updatePlanStepStatus", () => {
        const stateWithPlan = {
            ...initialState,
            technicalPlan: {
                steps: [
                    { file: "test.ts", status: "pending" as const },
                ]
            }
        };
        const actual = reducer(stateWithPlan as any, updatePlanStepStatus({ file: "test.ts", status: "completed" }));
        expect(actual.technicalPlan?.steps[0].status).toBe("completed");
    });

    test("should handle setChatTab", () => {
        const actual = reducer(initialState, setChatTab("context"));
        expect(actual.chatTab).toBe("context");
    });

    test("should handle setContextFiles", () => {
        const files = ["a.ts", "b.ts"];
        const actual = reducer(initialState, setContextFiles(files));
        expect(actual.contextFiles).toEqual(files);
    });

    test("should handle addContextFile", () => {
        const state = { ...initialState, contextFiles: ["a.ts"] };
        const actual = reducer(state, addContextFile("b.ts"));
        expect(actual.contextFiles).toEqual(["a.ts", "b.ts"]);
        
        // Should not add duplicates
        const actualDup = reducer(actual, addContextFile("a.ts"));
        expect(actualDup.contextFiles).toHaveLength(2);
    });

    test("should handle removeContextFile", () => {
        const state = { ...initialState, contextFiles: ["a.ts", "b.ts"] };
        const actual = reducer(state, removeContextFile("a.ts"));
        expect(actual.contextFiles).toEqual(["b.ts"]);
    });

    test("should handle updateChatMessage", () => {
        const state = {
            ...initialState,
            chatMessages: [{ role: "user", content: "old" }]
        };
        const actual = reducer(state as any, updateChatMessage({ index: 0, content: "new" }));
        expect(actual.chatMessages[0].content).toBe("new");
    });

    test("should handle updateChatMessageById", () => {
        const state = {
            ...initialState,
            chatMessages: [{ id: "m1", role: "assistant" as const, content: "old", thinking: "old thought" }]
        };
        const actual = reducer(state as any, updateChatMessageById({ id: "m1", content: "new", thinking: "new thought" }));
        expect(actual.chatMessages[0].content).toBe("new");
        expect(actual.chatMessages[0].thinking).toBe("new thought");

        // Test append
        const actualAppend = reducer(actual as any, updateChatMessageById({ id: "m1", content: " and more", append: true }));
        expect(actualAppend.chatMessages[0].content).toBe("new and more");
    });

    test("should handle setRepositories", () => {
        const repos = [{ id: "r1", fullName: "user/repo" }];
        const actual = reducer(initialState, setRepositories(repos));
        expect(actual.repositories).toEqual(repos);
    });

    test("should handle setSelectedRepoId", () => {
        const actual = reducer(initialState, setSelectedRepoId("r1"));
        expect(actual.selectedRepoId).toBe("r1");
    });

    test("should handle clearChat", () => {
        const state = {
            ...initialState,
            chatMessages: [{ role: "user", content: "msg" }],
            contextFiles: ["f.ts"],
            chatTab: "context" as const,
            selectedRepoId: "r1"
        };
        const actual = reducer(state as any, clearChat());
        expect(actual).toEqual(initialState);
    });
});
