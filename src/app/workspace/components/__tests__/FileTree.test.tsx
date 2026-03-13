import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import FileTree from "../FileTree";
import { FileNode } from "../../../actions/workspace-files";

describe("FileTree", () => {
    const mockTree: FileNode[] = [
        {
            name: "src",
            path: "src",
            type: "directory",
            children: [
                { name: "index.ts", path: "src/index.ts", type: "file" }
            ]
        },
        { name: "package.json", path: "package.json", type: "file" }
    ];

    const mockProps = {
        tree: mockTree,
        changedFiles: [],
        onSelectFile: jest.fn(),
        onRevertFile: jest.fn(),
        onStageFile: jest.fn(),
        onUnstageFile: jest.fn(),
        onRefresh: jest.fn(),
    };

    it("renders the explorer title", () => {
        render(<FileTree {...mockProps} />);
        expect(screen.getByText("Explorer")).toBeInTheDocument();
    });

    it("renders top-level items", () => {
        render(<FileTree {...mockProps} />);
        expect(screen.getByText("src")).toBeInTheDocument();
        expect(screen.getByText("package.json")).toBeInTheDocument();
    });

    it("calls onRefresh when the refresh button is clicked", () => {
        render(<FileTree {...mockProps} />);
        const refreshBtn = screen.getByTitle("Refresh File Tree");
        fireEvent.click(refreshBtn);
        expect(mockProps.onRefresh).toHaveBeenCalled();
    });

    it("expands a directory when clicked", () => {
        render(<FileTree {...mockProps} />);
        const srcDir = screen.getByText("src");
        fireEvent.click(srcDir);
        expect(screen.getByText("index.ts")).toBeInTheDocument();
    });

    it("calls onSelectFile when a file is clicked in Explorer", () => {
        render(<FileTree {...mockProps} />);
        fireEvent.click(screen.getByText("package.json"));
        expect(mockProps.onSelectFile).toHaveBeenCalledWith("package.json");
    });

    it("shows staged and unstaged changes when changedFiles provided", () => {
        const propsWithChanges = {
            ...mockProps,
            changedFiles: [
                { path: "src/index.ts", status: " M" }, // Unstaged modified
                { path: "package.json", status: "M " }, // Staged modified
                { path: "new-file.ts", status: "??" }  // Untracked (unstaged)
            ]
        };
        render(<FileTree {...propsWithChanges} />);
        
        expect(screen.getByText("Staged Changes")).toBeInTheDocument();
        expect(screen.getByText("Changes")).toBeInTheDocument();
        
        // Staged Changes section should have package.json
        const stagedSection = screen.getByText("Staged Changes").parentElement;
        expect(stagedSection).toHaveTextContent("package.json");
        
        // Changes section should have index.ts and new-file.ts
        const changesSection = screen.getByText("Changes").parentElement;
        expect(changesSection).toHaveTextContent("index.ts");
        expect(changesSection).toHaveTextContent("new-file.ts");
    });

    it("calls onStageFile when + button is clicked in Changes", () => {
        const propsWithChanges = {
            ...mockProps,
            changedFiles: [{ path: "src/index.ts", status: " M" }]
        };
        render(<FileTree {...propsWithChanges} />);
        
        const stageBtn = screen.getByTitle("Stage Change");
        fireEvent.click(stageBtn);
        expect(mockProps.onStageFile).toHaveBeenCalledWith("src/index.ts");
    });

    it("calls onUnstageFile when - button is clicked in Staged Changes", () => {
        const propsWithChanges = {
            ...mockProps,
            changedFiles: [{ path: "package.json", status: "M " }]
        };
        render(<FileTree {...propsWithChanges} />);
        
        const unstageBtn = screen.getByTitle("Unstage Change");
        fireEvent.click(unstageBtn);
        expect(mockProps.onUnstageFile).toHaveBeenCalledWith("package.json");
    });

    it("calls onRevertFile when revert button is clicked", () => {
        const propsWithChanges = {
            ...mockProps,
            changedFiles: [{ path: "src/index.ts", status: " M" }]
        };
        render(<FileTree {...propsWithChanges} />);
        
        const revertBtn = screen.getByTitle("Revert Change");
        fireEvent.click(revertBtn);
        expect(mockProps.onRevertFile).toHaveBeenCalledWith("src/index.ts");
    });

    it("calls onSelectFile when a file is clicked in Changes section", () => {
        const propsWithChanges = {
            ...mockProps,
            changedFiles: [{ path: "src/index.ts", status: " M" }]
        };
        render(<FileTree {...propsWithChanges} />);
        
        const changesSection = screen.getByText("Changes").parentElement!;
        const { getByText } = within(changesSection);
        fireEvent.click(getByText("index.ts"));
        expect(mockProps.onSelectFile).toHaveBeenCalledWith("src/index.ts");
    });

    it("calls onSelectFile when a file is clicked in Staged Changes section", () => {
        const propsWithChanges = {
            ...mockProps,
            changedFiles: [{ path: "package.json", status: "M " }]
        };
        render(<FileTree {...propsWithChanges} />);
        
        const stagedSection = screen.getByText("Staged Changes").parentElement!;
        const { getByText } = within(stagedSection);
        fireEvent.click(getByText("package.json"));
        expect(mockProps.onSelectFile).toHaveBeenCalledWith("package.json");
    });

    it("shows status indicators in Explorer", () => {
        const propsWithChanges = {
            ...mockProps,
            changedFiles: [
                { path: "src/index.ts", status: " M" },
                { path: "package.json", status: "M " }
            ]
        };
        render(<FileTree {...propsWithChanges} />);
        
        // Expansion might be needed to see index.ts in Explorer
        fireEvent.click(screen.getByText("src"));
        
        // Check for M indicators in the explorer section (using leading spaces in status logic)
        // package.json status is "M " -> trims to "M" in indicator
        // index.ts status is " M" -> trims to "M" in indicator
        const indicators = screen.getAllByText("M");
        // We expect at least one for package.json and one for index.ts in explorer
        // plus potentially ones in the staged/unstaged sections
        expect(indicators.length).toBeGreaterThanOrEqual(2);
    });
});
