import React from "react";
import { render, screen } from "@testing-library/react";
import { EntryDetails } from "../EntryDetails";

describe("EntryDetails", () => {
    const mockEntry = {
        id: 1,
        benchmarkId: 1,
        category: "Math",
        prompt: "What is 2 + 2?",
        output: "The answer is 4.",
        score: 100,
        createdAt: new Date().toISOString(),
        error: null,
        parsedMetrics: {
            responseSizeBytes: 16,
            expectationResults: [
                { type: "exactMatch", value: "4", found: true }
            ],
            variationName: "Test Run"
        }
    } as unknown as import("@/types/agent").BenchmarkEntry & { 
        parsedMetrics: { 
            responseSizeBytes?: number; 
            expectationResults?: { type: string; value: string; found: boolean; }[]; 
            variationName?: string; 
        } | null; 
    }; // Type assertion since testing properties

    it("renders the test category and variation name", () => {
        render(<EntryDetails selectedEntry={mockEntry} />);
        expect(screen.getByText("Math Test")).toBeInTheDocument();
        expect(screen.getByText("Test Run")).toBeInTheDocument();
    });

    it("renders the prompt excerpt", () => {
        render(<EntryDetails selectedEntry={mockEntry} />);
        expect(screen.getByText(/What is 2 \+ 2\?/)).toBeInTheDocument();
    });

    it("renders the score", () => {
        render(<EntryDetails selectedEntry={mockEntry} />);
        expect(screen.getByText("100%")).toBeInTheDocument();
    });

    it("renders placeholder when score is null", () => {
        const entryWithoutScore = { ...mockEntry, score: null };
        render(<EntryDetails selectedEntry={entryWithoutScore} />);
        expect(screen.getByText("--")).toBeInTheDocument();
    });

    it("renders model response", () => {
        render(<EntryDetails selectedEntry={mockEntry} />);
        expect(screen.getByText("The answer is 4.")).toBeInTheDocument();
    });

    it("renders 'No response recorded' if output is missing", () => {
        const entryWithoutOutput = { ...mockEntry, output: null };
        render(<EntryDetails selectedEntry={entryWithoutOutput} />);
        expect(screen.getByText("No response recorded.")).toBeInTheDocument();
    });

    it("renders parsed metrics", () => {
        render(<EntryDetails selectedEntry={mockEntry} />);
        expect(screen.getByText("16 bytes")).toBeInTheDocument();
        expect(screen.getByText("1 / 1")).toBeInTheDocument(); // 1 expectation met out of 1
    });

    it("renders breakdown of expectation results", () => {
        const entryWithMixedResults = {
            ...mockEntry,
            parsedMetrics: {
                ...mockEntry.parsedMetrics,
                expectationResults: [
                    { type: "exactMatch", value: "4", found: true },
                    { type: "regexMatch", value: "^\\d+$", found: false },
                ]
            }
        };
        render(<EntryDetails selectedEntry={entryWithMixedResults} />);
        
        expect(screen.getByText("exactMatch")).toBeInTheDocument();
        expect(screen.getByText("PASSED")).toBeInTheDocument();
        
        expect(screen.getByText("regexMatch")).toBeInTheDocument();
        expect(screen.getByText("FAILED")).toBeInTheDocument();
    });
});
