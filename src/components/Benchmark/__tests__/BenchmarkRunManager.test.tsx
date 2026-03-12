import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { BenchmarkRunManager } from "../BenchmarkRunManager";
import { triggerBenchmark, deleteBenchmarkRun, getActiveBenchmarks } from "@/app/actions/benchmarks";
import { useRouter } from "next/navigation";

jest.mock("next/navigation", () => ({
    useRouter: jest.fn()
}));

jest.mock("@/app/actions/benchmarks", () => ({
    triggerBenchmark: jest.fn(),
    deleteBenchmarkRun: jest.fn(),
    getActiveBenchmarks: jest.fn()
}));

jest.mock("../BenchmarkRunForm", () => ({
    BenchmarkRunForm: ({ onSuccess, onCancel }: { onSuccess: () => void, onCancel: () => void }) => (
        <div data-testid="benchmark-run-form">
            <button onClick={onSuccess}>Form Success</button>
            <button onClick={onCancel}>Form Cancel</button>
        </div>
    )
}));

describe("BenchmarkRunManager", () => {
    const mockRouter = {
        refresh: jest.fn(),
        push: jest.fn()
    };

    const mockRun = {
        id: "run-1",
        name: "Test Run",
        description: "A test run",
        models: JSON.stringify(["gpt-4"]),
        contextGroupIds: JSON.stringify(["cg-1"]),
        parallelWorkers: 1,
        systemPromptId: null,
        systemPromptSetId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: "1",
        systemPromptIds: JSON.stringify([]),
        systemPromptSetIds: JSON.stringify([])
    } as unknown as import("@/types/agent").BenchmarkRun;

    const defaultProps = {
        initialRuns: [mockRun],
        contextGroups: [],
        systemPrompts: [],
        systemPromptSets: [],
        onBenchmarkStarted: jest.fn(),
        initialActiveBenchmarks: []
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue(mockRouter);
        (getActiveBenchmarks as jest.Mock).mockResolvedValue([]);
    });

    it("renders defined runs", () => {
        render(<BenchmarkRunManager {...defaultProps} />);
        expect(screen.getByText("Test Run")).toBeInTheDocument();
        expect(screen.getByText("1 Models")).toBeInTheDocument();
        expect(screen.getByText("1 Groups")).toBeInTheDocument();
    });

    it("renders empty state if no runs", () => {
        render(<BenchmarkRunManager {...defaultProps} initialRuns={[]} />);
        expect(screen.getByText("No runs defined yet")).toBeInTheDocument();
    });

    it("switches to form view when 'New Run' is clicked", () => {
        render(<BenchmarkRunManager {...defaultProps} />);
        fireEvent.click(screen.getByText(/New Run/));
        expect(screen.getByTestId("benchmark-run-form")).toBeInTheDocument();
    });

    it("switches to form view when edit icon is clicked", () => {
        render(<BenchmarkRunManager {...defaultProps} />);
        fireEvent.click(screen.getByText("✏️"));
        expect(screen.getByTestId("benchmark-run-form")).toBeInTheDocument();
    });

    it("handles delete flow", async () => {
        render(<BenchmarkRunManager {...defaultProps} />);
        
        // Click trash icon
        fireEvent.click(screen.getByText("🗑️"));
        
        // Confirm delete should appear
        const deleteConfirmBtn = screen.getByText("Delete");
        expect(deleteConfirmBtn).toBeInTheDocument();
        
        (deleteBenchmarkRun as jest.Mock).mockResolvedValue(undefined);
        
        await act(async () => {
            fireEvent.click(deleteConfirmBtn);
        });
        
        expect(deleteBenchmarkRun).toHaveBeenCalledWith("run-1");
        expect(mockRouter.refresh).toHaveBeenCalled();
        expect(screen.queryByText("Test Run")).not.toBeInTheDocument();
    });

    it("handles trigger run", async () => {
        render(<BenchmarkRunManager {...defaultProps} />);
        
        (triggerBenchmark as jest.Mock).mockResolvedValue("new-benchmark-id");
        
        const runNowBtn = screen.getByText("🚀 Run Now");
        
        await act(async () => {
            fireEvent.click(runNowBtn);
        });
        
        expect(triggerBenchmark).toHaveBeenCalledWith("run-1");
        expect(defaultProps.onBenchmarkStarted).toHaveBeenCalledWith("new-benchmark-id");
    });
});
