import { renderHook, waitFor } from "@testing-library/react";
import { useWorkspaceInit } from "../useWorkspaceInit";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { RootState } from "@/lib/store/store";
import * as workspaceActions from "@/app/actions/workspace";
import * as gitActions from "@/app/actions/git";
import * as configActions from "@/app/actions/config";
import * as settingsActions from "@/app/actions/settings";
import * as dockerActions from "@/app/actions/docker-sandboxes";

jest.mock("octokit", () => ({
    Octokit: jest.fn().mockImplementation(() => ({
        auth: jest.fn(),
    })),
    App: jest.fn(),
}));

jest.mock("@/lib/store/hooks");
jest.mock("@/app/actions/workspace");
jest.mock("@/app/actions/git");
jest.mock("@/app/actions/config");
jest.mock("@/app/actions/settings");
jest.mock("@/app/actions/docker-sandboxes");

describe("useWorkspaceInit", () => {
    const dispatch = jest.fn();
    const mockState = {
        workspace: {
            selectedRepoId: "repo-1",
            selectedBranch: "main",
            isLoadingInit: false,
        },
        chat: {
            selectedAgentId: "agent-1",
        },
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (useAppDispatch as unknown as jest.Mock).mockReturnValue(dispatch);
        (useAppSelector as unknown as jest.Mock).mockImplementation((selector: (state: RootState) => unknown) => selector(mockState as unknown as RootState));
        (configActions.getAgentConfigs as jest.Mock).mockResolvedValue([{ id: "agent-1", name: "Agent 1" }]);
        (workspaceActions.initWorkspace as jest.Mock).mockResolvedValue({ success: true });
        (gitActions.getRepoBranches as jest.Mock).mockResolvedValue(["main"]);
        (gitActions.getCurrentBranch as jest.Mock).mockResolvedValue({ success: true, branch: "main" });
        (settingsActions.getBranchProtection as jest.Mock).mockResolvedValue(true);
        (dockerActions.listSandboxes as jest.Mock).mockResolvedValue([]);
    });

    it("loads agents on mount", async () => {
        renderHook(() => useWorkspaceInit());
        await waitFor(() => {
            expect(configActions.getAgentConfigs).toHaveBeenCalled();
        });
    });

    it("initializes workspace when repo changes", async () => {
        renderHook(() => useWorkspaceInit());
        await waitFor(() => {
            expect(workspaceActions.initWorkspace).toHaveBeenCalledWith("repo-1");
            expect(gitActions.getRepoBranches).toHaveBeenCalledWith("repo-1");
        });
    });
});
