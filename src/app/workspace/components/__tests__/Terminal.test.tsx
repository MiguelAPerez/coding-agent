import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Terminal from "../Terminal";

describe("Terminal Component", () => {
    const defaultProps = {
        logs: [],
        onExecute: jest.fn(),
        isSandboxConnected: true,
        sandboxName: "test-sandbox",
        isFollowMode: false,
        onToggleFollow: jest.fn(),
        onClearLogs: jest.fn(),
    };

    it("renders empty state", () => {
        render(<Terminal {...defaultProps} />);
        expect(screen.getByText(/No output/i)).toBeInTheDocument();
        expect(screen.getByText(/Connected: test-sandbox/i)).toBeInTheDocument();
    });

    it("renders logs of different types", () => {
        const logs = [
            { type: "input" as const, content: "ls", timestamp: Date.now() },
            { type: "stdout" as const, content: "file.txt", timestamp: Date.now() },
            { type: "stderr" as const, content: "error occurred", timestamp: Date.now() },
            { type: "info" as const, content: "loading...", timestamp: Date.now() },
        ];
        render(<Terminal {...defaultProps} logs={logs} />);

        expect(screen.getByText("ls")).toBeInTheDocument();
        expect(screen.getByText("file.txt")).toBeInTheDocument();
        expect(screen.getByText("error occurred")).toBeInTheDocument();
        expect(screen.getByText("loading...")).toBeInTheDocument();
    });

    it("handles command execution", () => {
        render(<Terminal {...defaultProps} />);
        const input = screen.getByPlaceholderText(/Type a command/i);
        
        fireEvent.change(input, { target: { value: "npm test" } });
        fireEvent.keyDown(input, { key: "Enter" });

        expect(defaultProps.onExecute).toHaveBeenCalledWith("npm test");
        expect(input).toHaveValue("");
    });

    it("handles clear logs interaction", () => {
        render(<Terminal {...defaultProps} />);
        // Meta+K shortcut is handled in handleKeyDown
        const input = screen.getByPlaceholderText(/Type a command/i);
        fireEvent.keyDown(input, { key: "k", metaKey: true });
        
        expect(defaultProps.onClearLogs).toHaveBeenCalled();
    });

    it("toggles follow mode", () => {
        render(<Terminal {...defaultProps} />);
        const button = screen.getByText(/FOLLOW BOT/i);
        fireEvent.click(button);
        expect(defaultProps.onToggleFollow).toHaveBeenCalled();
    });

    it("shows disconnected state", () => {
        render(<Terminal {...defaultProps} isSandboxConnected={false} sandboxName={undefined} />);
        expect(screen.getByText(/Disconnected/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Select a repository/i)).toBeDisabled();
    });
});
