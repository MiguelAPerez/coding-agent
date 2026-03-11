import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import EditorArea from "../EditorArea";

// Mock Monaco Editor
jest.mock("@monaco-editor/react", () => {
    const MockEditor = (props: { value: string, onChange: (val: string) => void }) => {
        return (
            <div data-testid="monaco-editor">
                <textarea 
                    data-testid="monaco-textarea"
                    value={props.value} 
                    onChange={(e) => props.onChange(e.target.value)} 
                />
            </div>
        );
    };
    MockEditor.displayName = "MockEditor";
    return MockEditor;
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
}));

describe("EditorArea", () => {
    const mockTabs = [
        { path: "file1.ts", content: "content1", originalContent: "content1", gitHeadContent: "head1", isDirty: false },
        { path: "file2.ts", content: "content2", originalContent: "content2", gitHeadContent: null, isDirty: true },
    ];

    const mockProps = {
        tabs: mockTabs,
        activeTabPath: "file1.ts",
        onTabSelect: jest.fn(),
        onTabClose: jest.fn(),
        onContentChange: jest.fn(),
        onSaveFile: jest.fn(),
    };

    it("renders empty state when no tabs are open", () => {
        render(<EditorArea {...mockProps} tabs={[]} activeTabPath={null} />);
        expect(screen.getByText("Select a file from the explorer to open it.")).toBeInTheDocument();
    });

    it("renders tab headers correctly", () => {
        render(<EditorArea {...mockProps} />);
        expect(screen.getByText("file1.ts")).toBeInTheDocument();
        expect(screen.getByText("file2.ts")).toBeInTheDocument();
    });

    it("shows dirty indicator for dirty tabs", () => {
        render(<EditorArea {...mockProps} />);
        const dirtyTab = screen.getByText("file2.ts").closest("div");
        expect(dirtyTab?.querySelector(".bg-blue-500")).toBeInTheDocument();
    });

    it("calls onTabSelect when a tab is clicked", () => {
        render(<EditorArea {...mockProps} />);
        fireEvent.click(screen.getByText("file2.ts"));
        expect(mockProps.onTabSelect).toHaveBeenCalledWith("file2.ts");
    });

    it("calls onTabClose when close button is clicked", () => {
        render(<EditorArea {...mockProps} />);
        const closeBtns = screen.getAllByRole("button", { name: "×" });
        fireEvent.click(closeBtns[0]);
        expect(mockProps.onTabClose).toHaveBeenCalledWith("file1.ts");
    });

    it("renders the Monaco editor with active tab content", () => {
        render(<EditorArea {...mockProps} />);
        const textarea = screen.getByTestId("monaco-textarea");
        expect(textarea).toHaveValue("content1");
    });

    it("calls onContentChange when editor content changes", () => {
        render(<EditorArea {...mockProps} />);
        const textarea = screen.getByTestId("monaco-textarea");
        fireEvent.change(textarea, { target: { value: "new content" } });
        expect(mockProps.onContentChange).toHaveBeenCalledWith("file1.ts", "new content");
    });

    it("triggers onSaveFile on Ctrl+S", () => {
        render(<EditorArea {...mockProps} />);
        fireEvent.keyDown(window, { key: "s", ctrlKey: true });
        expect(mockProps.onSaveFile).toHaveBeenCalledWith("file1.ts");
    });

    it("triggers onSaveFile on Cmd+S", () => {
        render(<EditorArea {...mockProps} />);
        fireEvent.keyDown(window, { key: "s", metaKey: true });
        expect(mockProps.onSaveFile).toHaveBeenCalledWith("file1.ts");
    });
});
