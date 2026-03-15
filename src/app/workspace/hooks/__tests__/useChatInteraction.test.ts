import { renderHook, act } from "@testing-library/react";
import { useChatInteraction } from "../useChatInteraction";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { RootState } from "@/lib/store/store";

jest.mock("@/lib/store/hooks");

describe("useChatInteraction", () => {
    const dispatch = jest.fn();
    const handleSaveFile = jest.fn();
    const loadChangedFiles = jest.fn();
    const refreshGit = jest.fn();

    const mockState = {
        workspace: {
            selectedRepoId: "repo-1",
            activeTabPath: "test.ts",
            openTabs: [],
            fileTree: [],
        },
        chat: {
            chatMessages: [],
            agents: [],
            selectedAgentId: "agent-1",
            pendingSuggestion: null,
            chatTab: null,
            contextFiles: [],
            technicalPlan: null,
        },
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (useAppDispatch as unknown as jest.Mock).mockReturnValue(dispatch);
        (useAppSelector as unknown as jest.Mock).mockImplementation((selector: (state: RootState) => unknown) => selector(mockState as unknown as RootState));
        
        // Mock fetch for streaming
        const mockResponse = {
            ok: true,
            body: {
                getReader: () => {
                    let count = 0;
                    return {
                        read: () => {
                            if (count === 0) {
                                count++;
                                return Promise.resolve({ done: false, value: new TextEncoder().encode("Chunk 1") });
                            }
                            return Promise.resolve({ done: true });
                        },
                        releaseLock: jest.fn()
                    };
                }
            }
        };
        global.fetch = jest.fn().mockResolvedValue(mockResponse);
    });

    it("handles sending a message", async () => {
        const { result } = renderHook(() => useChatInteraction(handleSaveFile, loadChangedFiles, refreshGit));

        await act(async () => {
            await result.current.handleSendMessage("fix bug");
        });

        expect(global.fetch).toHaveBeenCalledWith("/api/chat", expect.objectContaining({
            method: "POST",
            body: expect.stringContaining('"prompt":"fix bug"')
        }));
        
        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: expect.stringContaining("addChatMessage") }));
        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: expect.stringContaining("updateChatMessageById") }));
    });
});
