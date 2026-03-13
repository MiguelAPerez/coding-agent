import { renderHook, act } from "@testing-library/react";
import { useFileManagement } from "../useFileManagement";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { RootState } from "@/lib/store/store";
import * as fileActions from "@/app/actions/workspace-files";

jest.mock("@/lib/store/hooks");
jest.mock("@/app/actions/workspace-files");

describe("useFileManagement", () => {
    const dispatch = jest.fn();
    const mockState = {
        workspace: {
            selectedRepoId: "repo-1",
            openTabs: [],
            activeTabPath: null,
        },
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (useAppDispatch as unknown as jest.Mock).mockReturnValue(dispatch);
        (useAppSelector as unknown as jest.Mock).mockImplementation((selector: (state: RootState) => unknown) => selector(mockState as unknown as RootState));
        (fileActions.getWorkspaceFileContent as jest.Mock).mockResolvedValue("content");
        (fileActions.getGitFileContent as jest.Mock).mockResolvedValue("git content");
    });

    it("handles file selection and adds a tab", async () => {
        const { result } = renderHook(() => useFileManagement());
        
        await act(async () => {
            await result.current.handleFileSelect("test.ts");
        });

        expect(fileActions.getWorkspaceFileContent).toHaveBeenCalledWith("repo-1", "test.ts");
        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: expect.stringContaining("addTab") }));
    });

    it("handles tab close", () => {
        const { result } = renderHook(() => useFileManagement());
        
        act(() => {
            result.current.handleTabClose("test.ts");
        });

        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: expect.stringContaining("closeTab") }));
    });
});
