import { useState, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
    addChatMessage,
    setPendingSuggestion,
    setChatTab,
    addContextFile,
    removeContextFile,
    setTechnicalPlan,
    updatePlanStepStatus,
} from "@/lib/store/features/chat/chatSlice";
import {
    updateTabContent,
    Tab,
} from "@/lib/store/features/workspace/workspaceSlice";
import {
    chatWithAgent,
    getTechnicalPlan,
    ChatMessage,
    FileChange,
    PendingSuggestion,
} from "@/app/actions/chat";
import {
    saveWorkspaceFile,
} from "@/app/actions/workspace-files";

export function useChatInteraction(
    handleSaveFile: (path: string) => Promise<void>,
    loadChangedFiles: (repoId: string) => Promise<void>,
    refreshGit: () => void
) {
    const dispatch = useAppDispatch();
    const selectedRepoId = useAppSelector((state) => state.workspace.selectedRepoId);
    const activeTabPath = useAppSelector((state) => state.workspace.activeTabPath);
    const openTabs = useAppSelector((state) => state.workspace.openTabs);
    const chatMessages = useAppSelector((state) => state.chat.chatMessages);
    const agents = useAppSelector((state) => state.chat.agents);
    const selectedAgentId = useAppSelector((state) => state.chat.selectedAgentId);
    const pendingSuggestion = useAppSelector((state) => state.chat.pendingSuggestion);
    const technicalPlan = useAppSelector((state) => state.chat.technicalPlan);
    const chatTab = useAppSelector((state) => state.chat.chatTab);
    const contextFiles = useAppSelector((state) => state.chat.contextFiles);
    const fileTree = useAppSelector((state) => state.workspace.fileTree);

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
            // If we don't have a plan and the message doesn't look like a simple follow-up, get a plan
            // For now, let's always get a plan if one isn't active to test the flow
            if (!technicalPlan && chatMessages.length < 10) {
                const res = await getTechnicalPlan(selectedRepoId, activeTabPath, message, selectedAgentId, chatMessages);
                const newAssistantMessage: ChatMessage = { role: "assistant", content: res.message };
                dispatch(addChatMessage(newAssistantMessage));
                if (res.plan) {
                    dispatch(setTechnicalPlan(res.plan));
                }
                return;
            }

            const res = await chatWithAgent(selectedRepoId, activeTabPath, message, selectedAgentId, chatMessages);
            
            const newAssistantMessage: ChatMessage = { role: "assistant", content: res.message };
            dispatch(addChatMessage(newAssistantMessage));

            if (res.suggestion) {
                dispatch(setPendingSuggestion(res.suggestion));
                dispatch(setChatTab("suggestions"));

                (Object.entries(res.suggestion.filesChanged) as [string, FileChange][]).forEach(([path, change]) => {
                    const isOpen = openTabs.some((t: Tab) => t.path === path);
                    if (isOpen) {
                        dispatch(updateTabContent({ path, content: change.suggestedContent }));
                    }
                    dispatch(addContextFile(path));
                });
            } else if (res.plan) {
                dispatch(setTechnicalPlan(res.plan));
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
                
                // Focus on the specific file
                const stepPrompt = `Plan Step: ${step.action} ${step.file}\nRationale: ${step.rationale}\n\nPlease implement this change now according to the technical plan. Provide the FULL FILE content.`;
                const res = await chatWithAgent(selectedRepoId, step.file, stepPrompt, selectedAgentId, chatMessages);
                
                if (res.suggestion) {
                    // Merge suggestions
                    combinedSuggestion.filesChanged = {
                        ...combinedSuggestion.filesChanged,
                        ...res.suggestion.filesChanged
                    };
                    
                    // Update tab content for real-time feedback
                    Object.entries(res.suggestion.filesChanged).forEach(([path, change]) => {
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
            const isOpen = openTabs.some((t: Tab) => t.path === path);
            if (isOpen) {
                dispatch(updateTabContent({ path, content: change.suggestedContent }));
                await handleSaveFile(path);
            } else {
                try {
                    await saveWorkspaceFile(selectedRepoId, path, change.suggestedContent);
                } catch (e) {
                    console.error("Failed to save background file", e);
                }
            }
        }
        await loadChangedFiles(selectedRepoId);
        refreshGit();
        dispatch(setPendingSuggestion(null));
        dispatch(setTechnicalPlan(null));
        dispatch(setChatTab(null));
    }, [selectedRepoId, pendingSuggestion, openTabs, handleSaveFile, loadChangedFiles, refreshGit, dispatch]);

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
