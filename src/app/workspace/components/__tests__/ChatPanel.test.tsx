import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ChatPanel from "../ChatPanel";

window.HTMLElement.prototype.scrollIntoView = jest.fn();

describe("ChatPanel", () => {
    const mockProps = {
        contextFiles: ["file1.ts", "file2.ts"],
        onRemoveContext: jest.fn(),
        onSendMessage: jest.fn(),
        pendingSuggestion: null,
        onApproveSuggestion: jest.fn(),
        onRejectSuggestion: jest.fn(),
        onJumpToFile: jest.fn(),
        activeTab: null as "context" | "suggestions" | null,
        onTabChange: jest.fn(),
        agents: [{ id: "agent1", name: "Agent 1" }],
        selectedAgentId: "agent1",
        onSelectAgent: jest.fn(),
        messages: [],
        allFiles: ["file1.ts", "file2.ts", "src/index.ts"],
        onAddContext: jest.fn()
    };

    it("renders the copilot title", () => {
        render(<ChatPanel {...mockProps} />);
        expect(screen.getByText("Workspace Copilot")).toBeInTheDocument();
    });

    it("shows the context file count on the context tab button", () => {
        render(<ChatPanel {...mockProps} />);
        expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("calls onTabChange when context tab is clicked", () => {
        render(<ChatPanel {...mockProps} />);
        const contextBtn = screen.getByTitle("View Context");
        fireEvent.click(contextBtn);
        expect(mockProps.onTabChange).toHaveBeenCalledWith("context");
    });

    it("displays context files when activeTab is 'context'", () => {
        render(<ChatPanel {...mockProps} activeTab="context" />);
        expect(screen.getByText("file1.ts")).toBeInTheDocument();
        expect(screen.getByText("file2.ts")).toBeInTheDocument();
    });

    it("calls onRemoveContext when remove button is clicked", () => {
        render(<ChatPanel {...mockProps} activeTab="context" />);
        const removeBtns = screen.getAllByRole("button", { name: "×" });
        fireEvent.click(removeBtns[0]);
        expect(mockProps.onRemoveContext).toHaveBeenCalledWith("file1.ts");
    });

    it("shows suggestion tab as disabled when no pending suggestion", () => {
        render(<ChatPanel {...mockProps} />);
        const suggestionBtn = screen.getByTitle("View AI Suggestions");
        expect(suggestionBtn).toBeDisabled();
    });

    it("shows suggestion pulse when pending suggestion exists", () => {
        const propsWithSuggestion = {
            ...mockProps,
            pendingSuggestion: {
                chatId: 0,
                messages: [],
                filesChanged: { "file1.ts": { startLine: 0, endLine: 0, column: 0, originalContent: "", suggestedContent: "" } }
            }
        };
        render(<ChatPanel {...propsWithSuggestion} />);
        const pulse = screen.getByTitle("View AI Suggestions").querySelector(".animate-pulse");
        expect(pulse).toBeInTheDocument();
    });

    it("calls onTabChange when suggestion tab is clicked and suggestion exists", () => {
        const propsWithSuggestion = {
            ...mockProps,
            pendingSuggestion: {
                chatId: 0,
                messages: [],
                filesChanged: { "file1.ts": { startLine: 0, endLine: 0, column: 0, originalContent: "", suggestedContent: "" } }
            }
        };
        render(<ChatPanel {...propsWithSuggestion} />);
        const suggestionBtn = screen.getByTitle("View AI Suggestions");
        fireEvent.click(suggestionBtn);
        expect(mockProps.onTabChange).toHaveBeenCalledWith("suggestions");
    });

    it("displays apply and discard buttons when activeTab is 'suggestions'", () => {
        const propsWithSuggestion = {
            ...mockProps,
            activeTab: "suggestions" as const,
            pendingSuggestion: {
                chatId: 0,
                messages: [],
                filesChanged: { "file1.ts": { startLine: 0, endLine: 0, column: 0, originalContent: "", suggestedContent: "" } }
            }
        };
        render(<ChatPanel {...propsWithSuggestion} />);
        expect(screen.getByText("Apply")).toBeInTheDocument();
        expect(screen.getByText("Discard")).toBeInTheDocument();
    });

    it("calls onApproveSuggestion when Apply is clicked", () => {
        const propsWithSuggestion = {
            ...mockProps,
            activeTab: "suggestions" as const,
            pendingSuggestion: {
                chatId: 0,
                messages: [],
                filesChanged: { "file1.ts": { startLine: 0, endLine: 0, column: 0, originalContent: "", suggestedContent: "" } }
            }
        };
        render(<ChatPanel {...propsWithSuggestion} />);
        fireEvent.click(screen.getByText("Apply"));
        expect(mockProps.onApproveSuggestion).toHaveBeenCalled();
    });

    it("calls onSendMessage when input is submitted", () => {
        render(<ChatPanel {...mockProps} />);
        const input = screen.getByPlaceholderText("Ask Copilot... (use @ to mention files)");
        fireEvent.change(input, { target: { value: "test message" } });
        fireEvent.click(screen.getByTitle("Send Message"));
        expect(mockProps.onSendMessage).toHaveBeenCalledWith("test message");
    });

    it("shows mentions dropdown when @ is typed", () => {
        render(<ChatPanel {...mockProps} />);
        const input = screen.getByPlaceholderText("Ask Copilot... (use @ to mention files)");
        fireEvent.change(input, { target: { value: "@" } });
        expect(screen.getByText("src/index.ts")).toBeInTheDocument();
    });

    it("calls onAddContext when a mention is selected", () => {
        render(<ChatPanel {...mockProps} />);
        const input = screen.getByPlaceholderText("Ask Copilot... (use @ to mention files)");
        fireEvent.change(input, { target: { value: "@src" } });
        const mentionBtn = screen.getByText("src/index.ts");
        fireEvent.click(mentionBtn);
        expect(mockProps.onAddContext).toHaveBeenCalledWith("src/index.ts");
        expect(input).toHaveValue("@src/index.ts");
    });
});
