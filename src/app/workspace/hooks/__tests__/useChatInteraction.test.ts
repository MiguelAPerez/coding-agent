import { renderHook, act } from "@testing-library/react";
import { useChatInteraction } from "../useChatInteraction";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { RootState } from "@/lib/store/store";
import * as chatActions from "@/app/actions/chat";

jest.mock("@/lib/store/hooks");
jest.mock("@/app/actions/chat");

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
        },
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (useAppDispatch as unknown as jest.Mock).mockReturnValue(dispatch);
        (useAppSelector as unknown as jest.Mock).mockImplementation((selector: (state: RootState) => unknown) => selector(mockState as unknown as RootState));
        (chatActions.chatWithAgent as jest.Mock).mockResolvedValue({
            message: "I suggested some changes.",
            suggestion: {
                filesChanged: { "test.ts": { suggestedContent: "new content", originalContent: "initial content" } }
            }
        });
    });

    it("handles sending a message", async () => {
        const { result } = renderHook(() => useChatInteraction(handleSaveFile, loadChangedFiles, refreshGit));
        
        await act(async () => {
            await result.current.handleSendMessage("fix bug");
        });

        expect(chatActions.chatWithAgent).toHaveBeenCalledWith("repo-1", "test.ts", "fix bug", "agent-1", []);
        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: expect.stringContaining("addChatMessage") }));
    });
});
