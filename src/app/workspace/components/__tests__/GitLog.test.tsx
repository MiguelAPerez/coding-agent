import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import GitLog from "../GitLog";
import { getGitLog } from "@/app/actions/git";

// Mock the server action
jest.mock("@/app/actions/git", () => ({
    getGitLog: jest.fn(),
}));

describe("GitLog", () => {
    const mockRepoId = "test-repo";

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders loading state initially and then the log", async () => {
        (getGitLog as jest.Mock).mockResolvedValue({
            success: true,
            log: "* commit 1\n* commit 2",
        });

        render(<GitLog repoId={mockRepoId} />);

        expect(screen.getByText(/Loading tree.../i)).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText(/\* commit 1/)).toBeInTheDocument();
            expect(screen.getByText(/\* commit 2/)).toBeInTheDocument();
        });

        expect(getGitLog).toHaveBeenCalledWith(mockRepoId);
    });

    it("renders error message on failure", async () => {
        (getGitLog as jest.Mock).mockResolvedValue({
            success: false,
        });

        render(<GitLog repoId={mockRepoId} />);

        await waitFor(() => {
            expect(screen.getByText(/Error loading git log\./i)).toBeInTheDocument();
        });
    });

    it("refetches log when refresh button is clicked", async () => {
        (getGitLog as jest.Mock).mockResolvedValue({
            success: true,
            log: "initial log",
        });

        render(<GitLog repoId={mockRepoId} />);

        await screen.findByText("initial log");

        (getGitLog as jest.Mock).mockResolvedValue({
            success: true,
            log: "refreshed log",
        });

        const refreshButton = screen.getByTitle(/Refresh Tree/i);
        fireEvent.click(refreshButton);

        await waitFor(() => {
            expect(screen.getByText("refreshed log")).toBeInTheDocument();
        });

        expect(getGitLog).toHaveBeenCalledTimes(2);
    });

    it("refetches log when refreshTrigger changes", async () => {
        (getGitLog as jest.Mock).mockResolvedValue({
            success: true,
            log: "log 1",
        });

        const { rerender } = render(<GitLog repoId={mockRepoId} refreshTrigger={1} />);

        await screen.findByText("log 1");

        (getGitLog as jest.Mock).mockResolvedValue({
            success: true,
            log: "log 2",
        });

        rerender(<GitLog repoId={mockRepoId} refreshTrigger={2} />);

        await waitFor(() => {
            expect(screen.getByText("log 2")).toBeInTheDocument();
        });

        expect(getGitLog).toHaveBeenCalledTimes(2);
    });

    it("renders nothing if repoId is missing", () => {
        const { container } = render(<GitLog repoId="" />);
        expect(container.firstChild).toBeNull();
    });
});
