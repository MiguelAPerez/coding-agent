import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { BenchmarkResults } from "../BenchmarkResults";
import { getOllamaModels } from "@/app/actions/ollama";
import { clearBenchmarkData } from "@/app/actions/benchmarks";

jest.mock("@/app/actions/ollama", () => ({
    getOllamaModels: jest.fn()
}));

jest.mock("@/app/actions/benchmarks", () => ({
    clearBenchmarkData: jest.fn()
}));

describe("BenchmarkResults", () => {
    const mockData = [
        {
            id: "b-1",
            name: "Test Run 1",
            status: "completed",
            parallelWorkers: 1,
            totalEntries: 2,
            entries: [
                {
                    id: "e-1",
                    benchmarkId: 1,
                    model: "GPT-4",
                    status: "completed",
                    category: "Math",
                    score: 95,
                    duration: 1000,
                    metrics: JSON.stringify({ 
                        responseSize: 100, 
                        expectationResults: [{ found: true }, { found: true }],
                        variationName: "Prompt A"
                    }),
                    createdAt: new Date().toISOString()
                },
                {
                    id: "e-2",
                    benchmarkId: 1,
                    model: "Claude",
                    status: "completed",
                    category: "Math",
                    score: 85,
                    duration: 1200,
                    metrics: JSON.stringify({ 
                        responseSize: 150, 
                        expectationResults: [{ found: true }, { found: false }],
                        variationName: "Prompt A"
                    }),
                    createdAt: new Date().toISOString()
                }
            ]
        }
    ] as unknown as (import("@/types/agent").Benchmark & { entries: import("@/types/agent").BenchmarkEntry[] })[];

    beforeEach(() => {
        jest.clearAllMocks();
        (getOllamaModels as jest.Mock).mockResolvedValue([
            { name: "GPT-4", details: JSON.stringify({ capabilities: ["thinking"] }) }
        ]);
        jest.spyOn(window, "alert").mockImplementation(() => {});
    });

    afterEach(() => {
        (window.alert as jest.Mock).mockRestore();
    });

    it("renders empty state when no data provided", async () => {
        await act(async () => {
            render(<BenchmarkResults data={[]} />);
        });
        expect(screen.getByText("No Results Yet")).toBeInTheDocument();
    });

    it("renders empty state when all entries are pending", async () => {
        const pendingData = [
            {
                id: "b-1",
                name: "Pending Run",
                entries: [
                    { status: "pending", score: null, model: "GPT-4" }
                ]
            }
        ] as unknown as (import("@/types/agent").Benchmark & { entries: import("@/types/agent").BenchmarkEntry[] })[];
        
        await act(async () => {
            render(<BenchmarkResults data={pendingData} />);
        });
        expect(screen.getByText("No Results Yet")).toBeInTheDocument();
    });

    it("renders model leaderboard by default", async () => {
        await act(async () => {
            render(<BenchmarkResults data={mockData} />);
        });

        await waitFor(() => {
            expect(screen.getByText("Model Leaderboard")).toBeInTheDocument();
        });

        expect(screen.getByText("GPT-4")).toBeInTheDocument();
        expect(screen.getByText("Claude")).toBeInTheDocument();
        
        // 95% average for GPT-4
        expect(screen.getByText("95%")).toBeInTheDocument();
        // 85% average for Claude
        expect(screen.getByText("85%")).toBeInTheDocument();
    });

    it("renders persona (variation) leaderboard when switched", async () => {
        await act(async () => {
            render(<BenchmarkResults data={mockData} />);
        });

        const personasBtn = screen.getByText("Personas");
        
        await act(async () => {
            fireEvent.click(personasBtn);
        });

        expect(screen.getByText("Persona Leaderboard")).toBeInTheDocument();
        // Both models used "Prompt A", average score is (95 + 85) / 2 = 90
        expect(screen.getAllByText("Prompt A").length).toBeGreaterThan(0);
        expect(screen.getByText("90%")).toBeInTheDocument();
    });

    it("shows detailed breakdown when a leaderboard item is clicked", async () => {
        await act(async () => {
            render(<BenchmarkResults data={mockData} />);
        });

        const gptRow = screen.getByText("GPT-4").closest("div[class*='cursor-pointer']");
        
        await act(async () => {
            fireEvent.click(gptRow!);
        });

        expect(screen.getByText("Category Performance Breakdown")).toBeInTheDocument();
        // Math is the category
        expect(screen.getByText("Math")).toBeInTheDocument();
        expect(screen.getAllByText("95%").length).toBeGreaterThan(1); // One in leaderboard, one in breakdown
    });

    it("handles the reset functionality", async () => {
        await act(async () => {
            render(<BenchmarkResults data={mockData} />);
        });

        const resetBtn = screen.getByText("🗑️ Reset Results");
        
        await act(async () => {
            fireEvent.click(resetBtn);
        });

        const confirmBtn = screen.getByText("Yes");
        
        (clearBenchmarkData as jest.Mock).mockResolvedValue(undefined);

        await act(async () => {
            fireEvent.click(confirmBtn);
        });

        expect(clearBenchmarkData).toHaveBeenCalled();
    });
});
