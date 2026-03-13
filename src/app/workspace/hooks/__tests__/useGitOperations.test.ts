import { renderHook, act } from "@testing-library/react";
import { useGitOperations } from "../useGitOperations";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { RootState } from "@/lib/store/store";
import * as gitActions from "@/app/actions/git";

jest.mock("octokit", () => ({
    Octokit: jest.fn().mockImplementation(() => ({
        auth: jest.fn(),
    })),
    App: jest.fn(),
}));

jest.mock("@/lib/store/hooks");
jest.mock("@/app/actions/git");

describe("useGitOperations", () => {
    const dispatch = jest.fn();
    const loadChangedFiles = jest.fn();
    const syncCurrentBranch = jest.fn();
    const addLog = jest.fn();
    
    const mockState = {
        workspace: {
            selectedRepoId: "repo-1",
            selectedBranch: "main",
            isMainProtected: true,
            isTerminalOpen: false,
        },
        terminal: {
            isFollowMode: false,
        },
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (useAppDispatch as unknown as jest.Mock).mockReturnValue(dispatch);
        (useAppSelector as unknown as jest.Mock).mockImplementation((selector: (state: RootState) => unknown) => selector(mockState as unknown as RootState));
        (gitActions.createBranch as jest.Mock).mockResolvedValue({ success: true });
        (gitActions.getRepoBranches as jest.Mock).mockResolvedValue(["main", "new-branch"]);
    });

    it("handles branch creation", async () => {
        const { result } = renderHook(() => useGitOperations(loadChangedFiles, syncCurrentBranch, addLog));
        
        await act(async () => {
            await result.current.handleCreateBranch("new-branch");
        });

        expect(gitActions.createBranch).toHaveBeenCalledWith("repo-1", "new-branch");
        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: expect.stringContaining("setSelectedBranch"), payload: "new-branch" }));
    });

    it("prevents commit to protected main branch", async () => {
        (gitActions.getCurrentBranch as jest.Mock).mockResolvedValue({ success: true, branch: "main" });
        window.alert = jest.fn();
        
        const { result } = renderHook(() => useGitOperations(loadChangedFiles, syncCurrentBranch, addLog));
        
        act(() => {
            result.current.setCommitMessage("test commit");
        });

        await act(async () => {
            await result.current.handleCommit();
        });

        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("Cannot commit directly to protected branch 'main'"));
        expect(gitActions.commitChanges).not.toHaveBeenCalled();
    });
});
