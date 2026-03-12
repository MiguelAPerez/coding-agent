import React from "react";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { BenchmarkProgress } from "../BenchmarkProgress";
import { getBenchmarkProgress, cancelBenchmark } from "@/app/actions/benchmarks";
import { getOllamaModels } from "@/app/actions/ollama";
import { Benchmark, BenchmarkEntry } from "@/types/agent";

type AppRouterInstance = ReturnType<typeof useRouter>;
type MockBenchmark = Benchmark & { 
    entries: BenchmarkEntry[];
    startedAt: Date | null;
    completedAt: Date | null;
    completedEntries: number;
    parallelWorkers: number;
};

// Mock dependencies
jest.mock("next/navigation", () => ({
    useRouter: jest.fn()
}));

jest.mock("@/app/actions/benchmarks", () => ({
    getBenchmarkProgress: jest.fn(),
    cancelBenchmark: jest.fn()
}));

jest.mock("@/app/actions/ollama", () => ({
    getOllamaModels: jest.fn()
}));

jest.mock("../EvaluationQueue", () => ({
    EvaluationQueue: () => <div data-testid="evaluation-queue" />
}));

const mockedUseRouter = jest.mocked(useRouter);
const mockedGetBenchmarkProgress = jest.mocked(getBenchmarkProgress);
const mockedCancelBenchmark = jest.mocked(cancelBenchmark);
const mockedGetOllamaModels = jest.mocked(getOllamaModels);

const mockRouter: AppRouterInstance = {
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
};

describe("BenchmarkProgress", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedUseRouter.mockReturnValue(mockRouter);
        mockedGetOllamaModels.mockResolvedValue([]);
        global.fetch = jest.fn().mockReturnValue(new Promise(() => {}));
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it("renders loading state initially if initialBenchmarkId is provided", async () => {
        mockedGetBenchmarkProgress.mockReturnValue(new Promise(() => {}));
        
        await act(async () => {
            render(<BenchmarkProgress initialBenchmarkId="123" contextGroups={[]} />);
        });
        
        expect(screen.getByText("Loading benchmark progress...")).toBeInTheDocument();
    });

    it("renders empty state if no benchmark is found", async () => {
        mockedGetBenchmarkProgress.mockResolvedValue(null);
        
        await act(async () => {
            render(<BenchmarkProgress initialBenchmarkId="123" contextGroups={[]} />);
        });
        
        await waitFor(() => {
            expect(screen.getByText("No Active Benchmark")).toBeInTheDocument();
        });
    });

    it("renders benchmark details and handles cancellation", async () => {
        const mockBenchmark: MockBenchmark = {
            id: "123",
            userId: "u1",
            runId: "r1",
            name: "Test Benchmark",
            status: "running",
            parallelWorkers: 1,
            totalEntries: 2,
            completedEntries: 1,
            entries: [
                { id: "e1", status: "completed", benchmarkId: "123", model: "gpt-4", contextGroupId: "cg1", category: "Logic", score: 100, metrics: null, prompt: null, systemContext: null, output: null, error: null, duration: null, startedAt: new Date(), completedAt: new Date(), systemPromptId: null },
                { id: "e2", status: "pending", benchmarkId: "123", model: "gpt-4", contextGroupId: "cg1", category: "Logic", score: null, metrics: null, prompt: null, systemContext: null, output: null, error: null, duration: null, startedAt: null, completedAt: null, systemPromptId: null }
            ],
            startedAt: new Date(),
            completedAt: null
        };

        mockedGetBenchmarkProgress.mockResolvedValue(mockBenchmark);

        await act(async () => {
            render(<BenchmarkProgress initialBenchmarkId="123" contextGroups={[]} />);
        });

        await waitFor(() => {
            expect(screen.getByText("Test Benchmark")).toBeInTheDocument();
        });

        expect(screen.getByText("50%")).toBeInTheDocument();

        // Click cancel
        const cancelBtn = screen.getByText("Cancel Run");
        fireEvent.click(cancelBtn);

        // Confirm cancel
        const confirmBtn = screen.getByText("Yes, Cancel");
        expect(confirmBtn).toBeInTheDocument();
        
        // Mock successful cancel
        mockedCancelBenchmark.mockResolvedValue(undefined);
        const canceledBenchmark: MockBenchmark = { 
            ...mockBenchmark, 
            status: "cancelled" 
        };
        mockedGetBenchmarkProgress.mockResolvedValue(canceledBenchmark);

        fireEvent.click(confirmBtn);

        await waitFor(() => {
            expect(mockedCancelBenchmark).toHaveBeenCalledWith("123");
        });
        
        await waitFor(() => {
            expect(mockRouter.refresh).toHaveBeenCalled();
        });
    });

    it("polls for progress every 5 seconds", async () => {
        const mockBenchmark: MockBenchmark = {
            id: "123",
            userId: "u1",
            runId: "r1",
            name: "Test Benchmark",
            status: "running",
            parallelWorkers: 1,
            totalEntries: 1,
            completedEntries: 0,
            entries: [],
            startedAt: new Date(),
            completedAt: null
        };

        mockedGetBenchmarkProgress.mockResolvedValue(mockBenchmark);
        
        await act(async () => {
            render(<BenchmarkProgress initialBenchmarkId="123" contextGroups={[]} />);
        });

        await waitFor(() => {
            expect(mockedGetBenchmarkProgress).toHaveBeenCalledTimes(1);
        });

        await act(async () => {
            jest.advanceTimersByTime(5000);
        });

        expect(mockedGetBenchmarkProgress).toHaveBeenCalledTimes(2);
    });

    it("spawns fetch steps when running", async () => {
        const mockBenchmark: MockBenchmark = {
            id: "123",
            userId: "u1",
            runId: "r1",
            name: "Test Benchmark",
            status: "running",
            parallelWorkers: 1,
            totalEntries: 1,
            completedEntries: 0,
            entries: [],
            startedAt: new Date(),
            completedAt: null
        };

        mockedGetBenchmarkProgress.mockResolvedValue(mockBenchmark);
        // We do not resolve fetch to avoid infinite microtask loop
        // global.fetch is already mocked to return pending promise in beforeEach

        await act(async () => {
            render(<BenchmarkProgress initialBenchmarkId="123" contextGroups={[]} />);
        });

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith("/api/benchmark/step", expect.any(Object));
        });
    });
});
