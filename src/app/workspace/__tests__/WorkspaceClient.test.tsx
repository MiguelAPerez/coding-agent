import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { makeStore } from "@/lib/store/store";
import WorkspaceClient from "../WorkspaceClient";

// Mock the hooks
jest.mock("../hooks/useWorkspaceInit", () => ({
    useWorkspaceInit: jest.fn(() => ({
        isLoadingInit: false,
        syncCurrentBranch: jest.fn(),
        addLog: jest.fn(),
    })),
}));

jest.mock("../hooks/useFileManagement", () => ({
    useFileManagement: jest.fn(() => ({
        openTabs: [],
        activeTabPath: null,
        handleFileSelect: jest.fn(),
        handleTabClose: jest.fn(),
        handleContentChange: jest.fn(),
        handleSaveFile: jest.fn(),
        handleRevertFile: jest.fn(),
        loadChangedFiles: jest.fn(),
    })),
}));

jest.mock("../hooks/useGitOperations", () => ({
    useGitOperations: jest.fn(() => ({
        commitMessage: "",
        setCommitMessage: jest.fn(),
        isPushing: false,
        isCommitting: false,
        gitRefreshKey: 0,
        refreshGit: jest.fn(),
        handleCreateBranch: jest.fn(),
        handleCommit: jest.fn(),
        handlePush: jest.fn(),
        handleStageFile: jest.fn(),
        handleUnstageFile: jest.fn(),
    })),
}));

jest.mock("../hooks/useChatInteraction", () => ({
    useChatInteraction: jest.fn(() => ({
        isChatLoading: false,
        chatMessages: [],
        agents: [],
        selectedAgentId: null,
        pendingSuggestion: null,
        chatTab: null,
        contextFiles: [],
        handleSendMessage: jest.fn(),
        handleApproveSuggestion: jest.fn(),
        handleRejectSuggestion: jest.fn(),
        handleRemoveContext: jest.fn(),
        handleAddContext: jest.fn(),
    })),
}));

jest.mock("../hooks/useTerminalExecution", () => ({
    useTerminalExecution: jest.fn(() => ({
        terminalLogs: [],
        isFollowMode: true,
        handleExecuteCommand: jest.fn(),
        handleClearLogs: jest.fn(),
        toggleFollowMode: jest.fn(),
    })),
}));

// Mock components
jest.mock("react-resizable-panels", () => {
    const Panel = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
    Panel.displayName = "Panel";
    const PanelGroup = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
    PanelGroup.displayName = "PanelGroup";
    const PanelResizeHandle = () => <div>Separator</div>;
    PanelResizeHandle.displayName = "PanelResizeHandle";
    return {
        Panel,
        Group: PanelGroup,
        Separator: PanelResizeHandle,
    };
});

jest.mock("../components/WorkspaceTopBar", () => {
    const MockTopBar = () => <div data-testid="top-bar">Mock Top Bar</div>;
    MockTopBar.displayName = "MockTopBar";
    return MockTopBar;
});

jest.mock("../components/FileTree", () => {
    const MockFileTree = () => <div data-testid="file-tree">Mock File Tree</div>;
    MockFileTree.displayName = "MockFileTree";
    return MockFileTree;
});

jest.mock("../components/EditorArea", () => {
    const MockEditorArea = () => <div data-testid="editor-area">Mock Editor Area</div>;
    MockEditorArea.displayName = "MockEditorArea";
    return MockEditorArea;
});

jest.mock("../components/ChatPanel", () => {
    const MockChatPanel = () => <div data-testid="chat-panel">Mock Chat Panel</div>;
    MockChatPanel.displayName = "MockChatPanel";
    return MockChatPanel;
});

jest.mock("../components/SourceControlPanel", () => {
    const MockSCPanel = () => <div data-testid="sc-panel">Mock SC Panel</div>;
    MockSCPanel.displayName = "MockSCPanel";
    return MockSCPanel;
});

describe("WorkspaceClient", () => {
    const mockRepos = [{ id: "repo-1", fullName: "test/repo", name: "repo", source: "github" }];

    const renderWithRedux = (ui: React.ReactElement) => {
        const store = makeStore();
        return render(
            <Provider store={store}>
                {ui}
            </Provider>
        );
    };

    it("renders core layout correctly", () => {
        renderWithRedux(<WorkspaceClient initialRepos={mockRepos} />);
        expect(screen.getByTestId("top-bar")).toBeInTheDocument();
        expect(screen.getByTestId("file-tree")).toBeInTheDocument();
        expect(screen.getByTestId("editor-area")).toBeInTheDocument();
        expect(screen.getByTestId("chat-panel")).toBeInTheDocument();
    });

    it("switches between Explorer and Source Control tabs", async () => {
        renderWithRedux(<WorkspaceClient initialRepos={mockRepos} />);
        
        // Initially in Explorer
        expect(screen.getByText("Explorer")).toBeInTheDocument();
        expect(screen.queryByTestId("sc-panel")).not.toBeInTheDocument();

        // Trigger switch by clicking Git icon (mocking part of the component logic)
        const gitButton = screen.getByTitle("Source Control");
        await act(async () => {
            fireEvent.click(gitButton);
        });

        // Should now show Source Control panel
        expect(screen.getByTestId("sc-panel")).toBeInTheDocument();
        expect(screen.queryByText("Explorer")).not.toBeInTheDocument();
    });
});
