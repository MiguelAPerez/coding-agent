import React from "react";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import { BenchmarkProgress } from "../BenchmarkProgress";
import { getBenchmarkProgress, cancelBenchmark } from "@/app/actions/benchmarks";
import { getOllamaModels } from "@/app/actions/ollama";
import { useRouter } from "next/navigation";

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

const mockRouter = {
    refresh: jest.fn()
};

describe("BenchmarkProgress", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue(mockRouter);
        (getOllamaModels as jest.Mock).mockResolvedValue([]);
        global.fetch = jest.fn().mockReturnValue(new Promise(() => {})) as jest.Mock;
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it("renders loading state initially if initialBenchmarkId is provided", async () => {
        (getBenchmarkProgress as jest.Mock).mockReturnValue(new Promise(() => {}));
        
        await act(async () => {
            render(<BenchmarkProgress initialBenchmarkId="123" />);
        });
        
        expect(screen.getByText("Loading benchmark progress...")).toBeInTheDocument();
    });

    it("renders empty state if no benchmark is found", async () => {
        (getBenchmarkProgress as jest.Mock).mockResolvedValue(null);
        
        await act(async () => {
            render(<BenchmarkProgress initialBenchmarkId="123" />);
        });
        
        await waitFor(() => {
            expect(screen.getByText("No Active Benchmark")).toBeInTheDocument();
        });
    });

    it("renders benchmark details and handles cancellation", async () => {
        const mockBenchmark = {
            id: "123",
            name: "Test Benchmark",
            status: "running",
            parallelWorkers: 1,
            totalEntries: 2,
            entries: [
                { id: "e1", status: "completed" },
                { id: "e2", status: "pending" }
            ]
        };

        (getBenchmarkProgress as jest.Mock).mockResolvedValue(mockBenchmark);

        await act(async () => {
            render(<BenchmarkProgress initialBenchmarkId="123" />);
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
        (cancelBenchmark as jest.Mock).mockResolvedValue(undefined);
        const canceledBenchmark = { ...mockBenchmark, status: "canceled" };
        (getBenchmarkProgress as jest.Mock).mockResolvedValue(canceledBenchmark);

        fireEvent.click(confirmBtn);

        await waitFor(() => {
            expect(cancelBenchmark).toHaveBeenCalledWith("123");
        });
        
        await waitFor(() => {
            expect(mockRouter.refresh).toHaveBeenCalled();
        });
    });

    it("polls for progress every 3 seconds", async () => {
        const mockBenchmark = {
            id: "123",
            name: "Test Benchmark",
            status: "running",
            parallelWorkers: 1,
            totalEntries: 1,
            entries: []
        };

        (getBenchmarkProgress as jest.Mock).mockResolvedValue(mockBenchmark);
        
        await act(async () => {
            render(<BenchmarkProgress initialBenchmarkId="123" />);
        });

        await waitFor(() => {
            expect(getBenchmarkProgress).toHaveBeenCalledTimes(1);
        });

        await act(async () => {
            jest.advanceTimersByTime(3000);
        });

        expect(getBenchmarkProgress).toHaveBeenCalledTimes(2);
    });

    it("spawns fetch steps when running", async () => {
        const mockBenchmark = {
            id: "123",
            name: "Test Benchmark",
            status: "running",
            parallelWorkers: 1,
            totalEntries: 1,
            entries: []
        };

        (getBenchmarkProgress as jest.Mock).mockResolvedValue(mockBenchmark);
        // We do not resolve fetch to avoid infinite microtask loop
        // global.fetch is already mocked to return pending promise in beforeEach

        await act(async () => {
            render(<BenchmarkProgress initialBenchmarkId="123" />);
        });

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith("/api/benchmark/step", expect.any(Object));
        });
    });
});
