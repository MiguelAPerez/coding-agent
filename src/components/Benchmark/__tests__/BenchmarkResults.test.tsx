import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { BenchmarkResults } from "../BenchmarkResults";
import { getOllamaModels } from "@/app/actions/ollama";
import { clearBenchmarkData } from "@/app/actions/benchmarks";
import { Benchmark, BenchmarkEntry } from "@/types/agent";

jest.mock("@/app/actions/ollama", () => ({
    getOllamaModels: jest.fn()
}));

jest.mock("@/app/actions/benchmarks", () => ({
    clearBenchmarkData: jest.fn()
}));

const mockedGetOllamaModels = jest.mocked(getOllamaModels);
const mockedClearBenchmarkData = jest.mocked(clearBenchmarkData);

describe("BenchmarkResults", () => {
    const mockData: (Benchmark & { entries: BenchmarkEntry[] })[] = [
        {
            id: "b-1",
            name: "Test Run 1",
            status: "completed",
            parallelWorkers: 1,
            totalEntries: 2,
            entries: [
                {
                    id: "e-1",
                    benchmarkId: "b-1",
                    model: "GPT-4",
                    status: "completed",
                    category: "Math",
                    metrics: JSON.stringify({ 
                        responseSize: 100, 
                        expectationResults: [{ found: true }, { found: true }],
                        variationName: "Prompt A"
                    }),
                    startedAt: new Date(),
                    completedAt: new Date(),
                    systemPromptId: null,
                    contextGroupId: "cg-1",
                    prompt: null,
                    systemContext: null,
                    output: null,
                    error: null,
                    duration: 1000,
                    score: 95
                },
                {
                    id: "e-2",
                    benchmarkId: "b-1",
                    model: "Claude",
                    status: "completed",
                    category: "Math",
                    metrics: JSON.stringify({ 
                        responseSize: 150, 
                        expectationResults: [{ found: true }, { found: false }],
                        variationName: "Prompt A"
                    }),
                    startedAt: new Date(),
                    completedAt: new Date(),
                    systemPromptId: null,
                    contextGroupId: "cg-1",
                    prompt: null,
                    systemContext: null,
                    output: null,
                    error: null,
                    duration: 1200,
                    score: 85
                }
            ],
            userId: "u-1",
            runId: "r-1",
            completedEntries: 2,
            startedAt: new Date(),
            completedAt: new Date()
        }
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        mockedGetOllamaModels.mockResolvedValue([
            { 
                id: "m-1", 
                userId: "u-1", 
                name: "GPT-4", 
                details: JSON.stringify({ capabilities: ["thinking"] }), 
                updatedAt: new Date() 
            }
        ]);
        jest.spyOn(window, "alert").mockImplementation(() => {});
    });

    afterEach(() => {
        jest.mocked(window.alert).mockRestore();
    });

    it("renders empty state when no data provided", async () => {
        await act(async () => {
            render(<BenchmarkResults data={[]} />);
        });
        expect(screen.getByText("No Results Yet")).toBeInTheDocument();
    });

    it("renders empty state when all entries are pending", async () => {
        const pendingData: (Benchmark & { entries: BenchmarkEntry[] })[] = [
            {
                id: "b-1",
                userId: "u-1",
                runId: "r-1",
                name: "Pending Run",
                status: "running",
                totalEntries: 1,
                completedEntries: 0,
                startedAt: new Date(),
                completedAt: null,
                entries: [
                    { 
                        id: "e-1",
                        benchmarkId: "b-1",
                        status: "pending", 
                        score: null, 
                        model: "GPT-4", 
                        contextGroupId: "cg-1", 
                        category: "Math",
                        metrics: null,
                        prompt: null,
                        systemContext: null,
                        output: null,
                        error: null,
                        duration: null,
                        startedAt: null,
                        completedAt: null,
                        systemPromptId: null
                    }
                ]
            }
        ];
        
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
        
        mockedClearBenchmarkData.mockResolvedValue(undefined);

        await act(async () => {
            fireEvent.click(confirmBtn);
        });

        expect(clearBenchmarkData).toHaveBeenCalled();
    });
});
