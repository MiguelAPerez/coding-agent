import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { EvaluationQueue } from "../EvaluationQueue";
import { Benchmark, BenchmarkEntry } from "@/types/agent";

jest.mock("../LiveTimer", () => ({
    LiveTimer: () => <span>0.0s</span>
}));

jest.mock("next/navigation", () => ({
    useRouter: () => ({
        push: jest.fn()
    })
}));

describe("EvaluationQueue", () => {
    const mockBenchmark: Benchmark & { entries: BenchmarkEntry[] } = {
        id: "1",
        userId: "u1",
        runId: "r1",
        name: "Test",
        status: "running",
        totalEntries: 2,
        completedEntries: 1,
        entries: [
            {
                id: "e1",
                benchmarkId: "1",
                model: "gpt-4",
                status: "completed",
                category: "Logic",
                contextGroupId: "cg1",
                score: 100,
                metrics: JSON.stringify({ expectationResults: [{ found: true }] }),
                duration: 1200,
                systemPromptId: null,
                prompt: null,
                systemContext: null,
                output: null,
                error: null,
                startedAt: new Date(),
                completedAt: new Date()
            },
            {
                id: "e2",
                benchmarkId: "1",
                model: "gpt-4",
                status: "running",
                category: "Math",
                contextGroupId: "cg2",
                score: null,
                startedAt: new Date(),
                systemPromptId: null,
                prompt: null,
                systemContext: null,
                output: null,
                error: null,
                completedAt: null,
                duration: null,
                metrics: null
            },
            {
                id: "e3",
                benchmarkId: "1",
                model: "claude-3",
                status: "pending",
                category: "Coding",
                contextGroupId: "cg3",
                score: null,
                systemPromptId: null,
                prompt: null,
                systemContext: null,
                output: null,
                error: null,
                duration: null,
                startedAt: null,
                completedAt: null,
                metrics: null
            }
        ]
    };

    type EvaluationQueueProps = React.ComponentProps<typeof EvaluationQueue>;

    const defaultProps: EvaluationQueueProps = {
        benchmark: mockBenchmark,
        collapsedModels: {},
        toggleModelCollapse: jest.fn(),
        selectedEntryId: null,
        setSelectedEntryId: jest.fn(),
        modelCapabilities: {
            "gpt-4": ["thinking", "tools"]
        },
        contextGroups: [
            { 
                id: "cg1", 
                userId: "u1",
                name: "Logic Test",
                description: null,
                category: "Logic",
                expectations: null,
                weight: null,
                maxSentences: null,
                systemContext: null,
                promptTemplate: "",
                skillIds: null,
                toolIds: null,
                systemPromptIds: null,
                systemPromptSetIds: null,
                updatedAt: new Date()
            },
            { 
                id: "cg2", 
                userId: "u1",
                name: "Math Test",
                description: null,
                category: "Math",
                expectations: null,
                weight: null,
                maxSentences: null,
                systemContext: null,
                promptTemplate: "",
                skillIds: null,
                toolIds: null,
                systemPromptIds: null,
                systemPromptSetIds: null,
                updatedAt: new Date()
            },
            { 
                id: "cg3", 
                userId: "u1",
                name: "Coding Test",
                description: null,
                category: "Coding",
                expectations: null,
                weight: null,
                maxSentences: null,
                systemContext: null,
                promptTemplate: "",
                skillIds: null,
                toolIds: null,
                systemPromptIds: null,
                systemPromptSetIds: null,
                updatedAt: new Date()
            }
        ]
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
        expect(screen.getByText("Logic Test")).toBeInTheDocument();
        expect(screen.getByText("Math")).toBeInTheDocument();
        expect(screen.getByText("Math Test")).toBeInTheDocument();
        expect(screen.getByText("Coding")).toBeInTheDocument();
        expect(screen.getByText("Coding Test")).toBeInTheDocument();
    });

    it("hides entries when a model is collapsed", () => {
        const props = {
            ...defaultProps,
            collapsedModels: { "claude-3": true }
        };
        render(<EvaluationQueue {...props} />);
        // claude-3 is collapsed, so its entries shouldn't be visible
        expect(screen.queryByText("Coding Test")).not.toBeInTheDocument();
        // gpt-4 is not collapsed
        expect(screen.getByText("Logic Test")).toBeInTheDocument();
    });

    it("calls toggleModelCollapse when model header is clicked", () => {
        render(<EvaluationQueue {...defaultProps} />);
        const header = screen.getByText("gpt-4").closest("h4");
        fireEvent.click(header!);
        expect(defaultProps.toggleModelCollapse).toHaveBeenCalledWith("gpt-4");
    });

    it("calls setSelectedEntryId when an entry is clicked", () => {
        render(<EvaluationQueue {...defaultProps} />);
        // Click on the first completed entry (Logic Test)
        const logicEntryText = screen.getByText("Logic Test");
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
        const logicEntryText = screen.getByText("Logic Test");
        const logicEntry = logicEntryText.closest("div[class*='glass p-4 rounded-2xl border transition-all']");
        expect(logicEntry?.className).toContain("border-primary bg-primary/5");
    });
});
