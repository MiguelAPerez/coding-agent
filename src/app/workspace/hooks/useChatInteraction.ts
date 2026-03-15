import { useState, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { ChatMessage, PendingSuggestion, FileChange, WorkMode } from "@/lib/chat/types";
import { 
    addChatMessage, 
    setPendingSuggestion, 
    setTechnicalPlan, 
    updatePlanStepStatus,
    setChatTab,
    addContextFile,
    removeContextFile,
    updateChatMessageById,
} from "@/lib/store/features/chat/chatSlice";
import { 
    updateTabContent,
    setTabSaved,
    Tab,
} from "@/lib/store/features/workspace/workspaceSlice";
import {
    saveWorkspaceFile,
} from "@/app/actions/workspace-files";
import { RootState } from "@/lib/store/store";

export function useChatInteraction(
    handleSaveFile: (path: string) => Promise<void>,
    loadChangedFiles: (repoId: string) => Promise<void>,
    refreshGit: () => void,
) {
    const dispatch = useAppDispatch();
    
    // Selectors
    const selectedRepoId = useAppSelector((state: RootState) => state.workspace.selectedRepoId);
    const activeTabPath = useAppSelector((state: RootState) => state.workspace.activeTabPath);
    const openTabs = useAppSelector((state: RootState) => state.workspace.openTabs);
    const chatMessages = useAppSelector((state: RootState) => state.chat.chatMessages);
    const agents = useAppSelector((state: RootState) => state.chat.agents);
    const selectedAgentId = useAppSelector((state: RootState) => state.chat.selectedAgentId);
    const pendingSuggestion = useAppSelector((state: RootState) => state.chat.pendingSuggestion);
    const technicalPlan = useAppSelector((state: RootState) => state.chat.technicalPlan);
    const chatTab = useAppSelector((state: RootState) => state.chat.chatTab);
    const contextFiles = useAppSelector((state: RootState) => state.chat.contextFiles);
    const fileTree = useAppSelector((state: RootState) => state.workspace.fileTree);

    const [isChatLoading, setIsChatLoading] = useState(false);

    const handleSendMessage = useCallback(async (message: string) => {
        if (!selectedAgentId) {
            alert("Please select an agent first.");
            return;
        }

        if (!selectedRepoId) return;

        const newUserMessage: ChatMessage = { role: "user", content: message };
        dispatch(addChatMessage(newUserMessage));
        setIsChatLoading(true);

        try {
            const isPlanning = !technicalPlan && chatMessages.length < 10;
            const mode: WorkMode = isPlanning ? "PLANNER" : "CODER";

            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: message,
                    repoId: selectedRepoId,
                    filePath: activeTabPath,
                    agentId: selectedAgentId,
                    workMode: mode,
                    history: chatMessages
                })
            });

            if (!response.ok) throw new Error("Failed to fetch");

            const reader = response.body?.getReader();
            if (!reader) throw new Error("No reader");

            let assistantContent = "";
            const assistantMsgId = Date.now().toString();
            dispatch(addChatMessage({ id: assistantMsgId, role: "assistant", content: "" }));

            const textDecoder = new TextDecoder();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = textDecoder.decode(value);
                assistantContent += chunk;
                dispatch(updateChatMessageById({ id: assistantMsgId, content: assistantContent }));
            }

            // After streaming, parse the final content for plans or suggestions
            if (isPlanning) {
                const { parseTechnicalPlan } = await import("@/lib/chat/utils");
                const plan = parseTechnicalPlan(assistantContent);
                if (plan) {
                    dispatch(setTechnicalPlan(plan));
                }
            } else {
                const { parseDiffs } = await import("@/lib/chat/utils");
                const { suggestion } = parseDiffs(assistantContent, activeTabPath || "", {}); 
                if (suggestion && Object.keys(suggestion.filesChanged).length > 0) {
                    dispatch(setPendingSuggestion(suggestion));
                    dispatch(setChatTab("suggestions"));

                    Object.entries(suggestion.filesChanged).forEach(([path, change]) => {
                        const isOpen = openTabs.some((t: Tab) => t.path === path);
                        if (isOpen) {
                            dispatch(updateTabContent({ path, content: (change as FileChange).suggestedContent }));
                        }
                        dispatch(addContextFile(path));
                    });
                }
            }

        } catch (e) {
            console.error("Chat failed", e);
            alert("Chat failed: " + (e instanceof Error ? e.message : String(e)));
        } finally {
            setIsChatLoading(false);
        }
    }, [selectedRepoId, activeTabPath, selectedAgentId, chatMessages, technicalPlan, openTabs, dispatch]);

    const handleApprovePlan = useCallback(async () => {
        if (!selectedRepoId || !technicalPlan || !selectedAgentId) return;

        setIsChatLoading(true);
        dispatch(setChatTab("plan"));

        const combinedSuggestion: PendingSuggestion = {
            chatId: Date.now(),
            messages: [],
            filesChanged: {}
        };

        try {
            for (const step of technicalPlan.steps) {
                dispatch(updatePlanStepStatus({ file: step.file, status: "in-progress" }));

                const stepPrompt = `Plan Step: ${step.action} ${step.file}\nRationale: ${step.rationale}\n\nPlease implement this change now according to the technical plan. Provide the FULL FILE content.`;
                
                const response = await fetch("/api/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        prompt: stepPrompt,
                        repoId: selectedRepoId,
                        filePath: step.file,
                        agentId: selectedAgentId,
                        workMode: "CODER",
                        history: chatMessages
                    })
                });

                if (!response.ok) throw new Error("Failed to fetch");

                const reader = response.body?.getReader();
                if (!reader) throw new Error("No reader");

                let assistantContent = "";
                const textDecoder = new TextDecoder();
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = textDecoder.decode(value);
                    assistantContent += chunk;
                }

                const { parseDiffs } = await import("@/lib/chat/utils");
                const { suggestion } = parseDiffs(assistantContent, step.file, {});

                if (suggestion) {
                    combinedSuggestion.filesChanged = {
                        ...combinedSuggestion.filesChanged,
                        ...suggestion.filesChanged
                    };

                    Object.entries(suggestion.filesChanged).forEach(([path, change]) => {
                        const isOpen = openTabs.some((t: Tab) => t.path === path);
                        if (isOpen) {
                            dispatch(updateTabContent({ path, content: (change as FileChange).suggestedContent }));
                        }
                        dispatch(addContextFile(path));
                    });
                }

                dispatch(updatePlanStepStatus({ file: step.file, status: "completed" }));
            }

            dispatch(setPendingSuggestion(combinedSuggestion));
            dispatch(setChatTab("suggestions"));
        } catch (e) {
            console.error("Plan execution failed", e);
            alert("Plan execution failed: " + (e instanceof Error ? e.message : String(e)));
        } finally {
            setIsChatLoading(false);
        }
    }, [selectedRepoId, technicalPlan, selectedAgentId, chatMessages, openTabs, dispatch]);

    const handleApproveSuggestion = useCallback(async () => {
        if (!selectedRepoId || !pendingSuggestion) return;

        for (const [path, change] of Object.entries(pendingSuggestion.filesChanged) as [string, FileChange][]) {
            try {
                await saveWorkspaceFile(selectedRepoId, path, change.suggestedContent);

                const isOpen = openTabs.some((t: Tab) => t.path === path);
                if (isOpen) {
                    dispatch(updateTabContent({ path, content: change.suggestedContent }));
                    dispatch(setTabSaved(path));
                }
            } catch (e) {
                console.error(`Failed to save ${path}`, e);
            }
        }
        await loadChangedFiles(selectedRepoId);
        refreshGit();
        dispatch(setPendingSuggestion(null));
        dispatch(setTechnicalPlan(null));
        dispatch(setChatTab(null));
    }, [selectedRepoId, pendingSuggestion, openTabs, loadChangedFiles, refreshGit, dispatch]);

    const handleRejectSuggestion = useCallback(() => {
        if (pendingSuggestion) {
            for (const [path, change] of Object.entries(pendingSuggestion.filesChanged) as [string, FileChange][]) {
                const isOpen = openTabs.some((t: Tab) => t.path === path);
                if (isOpen) {
                    dispatch(updateTabContent({ path, content: change.originalContent }));
                }
            }
            dispatch(setPendingSuggestion(null));
            dispatch(setChatTab(null));
        }
    }, [pendingSuggestion, openTabs, dispatch]);

    const handleRemoveContext = useCallback((path: string) => {
        dispatch(removeContextFile(path));
    }, [dispatch]);

    const handleAddContext = useCallback((path: string) => {
        dispatch(addContextFile(path));
    }, [dispatch]);

    return {
        isChatLoading,
        chatMessages,
        agents,
        selectedAgentId,
        pendingSuggestion,
        technicalPlan,
        chatTab,
        contextFiles,
        fileTree,
        handleSendMessage,
        handleApprovePlan,
        handleApproveSuggestion,
        handleRejectSuggestion,
        handleRemoveContext,
        handleAddContext,
    };
}
