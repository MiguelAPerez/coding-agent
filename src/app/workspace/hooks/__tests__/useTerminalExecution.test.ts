import { renderHook, act } from "@testing-library/react";
import { useTerminalExecution } from "../useTerminalExecution";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { RootState } from "@/lib/store/store";
import * as dockerActions from "@/app/actions/docker-sandboxes";

jest.mock("@/lib/store/hooks");
jest.mock("@/app/actions/docker-sandboxes");

describe("useTerminalExecution", () => {
    const dispatch = jest.fn();
    const syncCurrentBranch = jest.fn();
    const addLog = jest.fn();
    
    const mockState = {
        terminal: {
            activeSandbox: { id: "sandbox-1", name: "Sandbox 1" },
            terminalLogs: [],
            isFollowMode: true,
        },
        workspace: {
            selectedRepoId: "repo-1",
        },
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (useAppDispatch as unknown as jest.Mock).mockReturnValue(dispatch);
        (useAppSelector as unknown as jest.Mock).mockImplementation((selector: (state: RootState) => unknown) => selector(mockState as unknown as RootState));
        (dockerActions.executeSandboxCommand as jest.Mock).mockResolvedValue({ success: true, stdout: "output" });
    });

    it("handles command execution", async () => {
        const { result } = renderHook(() => useTerminalExecution(syncCurrentBranch, addLog));
        
        await act(async () => {
            await result.current.handleExecuteCommand("ls", "repo");
        });

        expect(dockerActions.executeSandboxCommand).toHaveBeenCalledWith("sandbox-1", "ls", "repo");
        expect(addLog).toHaveBeenCalledWith("stdout", "output");
        expect(syncCurrentBranch).toHaveBeenCalled();
    });
});
