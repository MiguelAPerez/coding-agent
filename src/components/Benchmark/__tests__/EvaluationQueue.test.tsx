import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { EvaluationQueue } from "../EvaluationQueue";

jest.mock("../LiveTimer", () => ({
    LiveTimer: () => <span>0.0s</span>
}));

describe("EvaluationQueue", () => {
    const mockBenchmark = {
        id: "1",
        name: "Test",
        status: "running",
        parallelWorkers: 1,
        totalEntries: 2,
        entries: [
            {
                id: "e1",
                benchmarkId: 1,
                model: "gpt-4",
                status: "completed",
                category: "Logic",
                score: 100,
                metrics: JSON.stringify({ expectationResults: [{ found: true }] }),
                duration: 1200
            },
            {
                id: "e2",
                benchmarkId: 1,
                model: "gpt-4",
                status: "running",
                category: "Math",
                score: null,
                startedAt: new Date().toISOString()
            },
            {
                id: "e3",
                benchmarkId: 1,
                model: "claude-3",
                status: "pending",
                category: "Coding",
                score: null
            }
        ]
    } as unknown as import("@/types/agent").Benchmark & { entries: import("@/types/agent").BenchmarkEntry[] };

    const defaultProps = {
        benchmark: mockBenchmark,
        collapsedModels: {},
        toggleModelCollapse: jest.fn(),
        selectedEntryId: null,
        setSelectedEntryId: jest.fn(),
        modelCapabilities: {
            "gpt-4": ["thinking", "tools"]
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders grouped models", () => {
        render(<EvaluationQueue {...defaultProps} />);
        expect(screen.getByText("gpt-4")).toBeInTheDocument();
        expect(screen.getByText("claude-3")).toBeInTheDocument();
    });

    it("renders model capabilities matching tools and thinking", () => {
        render(<EvaluationQueue {...defaultProps} />);
        expect(screen.getByTitle("Supports Tools")).toBeInTheDocument();
        expect(screen.getByTitle("Has Thinking Phase")).toBeInTheDocument();
    });

    it("shows progress counts per model", () => {
        render(<EvaluationQueue {...defaultProps} />);
        expect(screen.getByText("(1/2)")).toBeInTheDocument(); // gpt-4
        expect(screen.getByText("(0/1)")).toBeInTheDocument(); // claude-3
    });

    it("renders entries within models when not collapsed", () => {
        render(<EvaluationQueue {...defaultProps} />);
        expect(screen.getByText("Logic")).toBeInTheDocument();
        expect(screen.getByText("Math")).toBeInTheDocument();
        expect(screen.getByText("Coding")).toBeInTheDocument();
    });

    it("hides entries when a model is collapsed", () => {
        const props = {
            ...defaultProps,
            collapsedModels: { "claude-3": true }
        };
        render(<EvaluationQueue {...props} />);
        // claude-3 is collapsed, so its entries shouldn't be visible
        expect(screen.queryByText("Coding")).not.toBeInTheDocument();
        // gpt-4 is not collapsed
        expect(screen.getByText("Logic")).toBeInTheDocument();
    });

    it("calls toggleModelCollapse when model header is clicked", () => {
        render(<EvaluationQueue {...defaultProps} />);
        const header = screen.getByText("gpt-4").closest("h4");
        fireEvent.click(header!);
        expect(defaultProps.toggleModelCollapse).toHaveBeenCalledWith("gpt-4");
    });

    it("calls setSelectedEntryId when an entry is clicked", () => {
        render(<EvaluationQueue {...defaultProps} />);
        // Click on the first completed entry (Logic)
        const logicEntryText = screen.getByText("Logic");
        const logicEntry = logicEntryText.closest("div[class*='glass p-4 rounded-2xl border transition-all']");
        fireEvent.click(logicEntry!);
        expect(defaultProps.setSelectedEntryId).toHaveBeenCalledWith("e1");
    });

    it("indicates selected state correctly", () => {
        const props = {
            ...defaultProps,
            selectedEntryId: "e1"
        };
        render(<EvaluationQueue {...props} />);
        // It's hard to test Tailwind classes effectively without direct string matching, 
        // but it changes 'border-green-500/20' to 'border-primary bg-primary/5' for completed selected entries
        const logicEntryText = screen.getByText("Logic");
        const logicEntry = logicEntryText.closest("div[class*='glass p-4 rounded-2xl border transition-all']");
        expect(logicEntry?.className).toContain("border-primary bg-primary/5");
    });
});
