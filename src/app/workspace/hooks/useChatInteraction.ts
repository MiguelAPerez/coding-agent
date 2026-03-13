import { useState, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
    addChatMessage,
    setPendingSuggestion,
    setChatTab,
    addContextFile,
    removeContextFile,
} from "@/lib/store/features/chat/chatSlice";
import {
    updateTabContent,
    Tab,
} from "@/lib/store/features/workspace/workspaceSlice";
import {
    chatWithAgent,
    ChatMessage,
    FileChange,
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
            } else {
                alert("AI did not suggest any changes. Response: " + res.message);
            }
        } catch (e) {
            console.error("Chat failed", e);
            alert("Chat failed: " + (e instanceof Error ? e.message : String(e)));
        } finally {
            setIsChatLoading(false);
        }
    }, [selectedRepoId, activeTabPath, selectedAgentId, chatMessages, openTabs, dispatch]);

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
        chatTab,
        contextFiles,
        fileTree,
        handleSendMessage,
        handleApproveSuggestion,
        handleRejectSuggestion,
        handleRemoveContext,
        handleAddContext,
    };
}
