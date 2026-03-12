import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { BenchmarkRunner } from "../BenchmarkRunner";
import { runBenchmark } from "@/app/actions/benchmarks";
import { getOllamaModels } from "@/app/actions/ollama";
import { ContextGroup } from "@/types/agent";

jest.mock("@/app/actions/benchmarks", () => ({
    runBenchmark: jest.fn()
}));

jest.mock("@/app/actions/ollama", () => ({
    getOllamaModels: jest.fn()
}));

const mockedRunBenchmark = jest.mocked(runBenchmark);
const mockedGetOllamaModels = jest.mocked(getOllamaModels);

const mockContextGroups: ContextGroup[] = [
    {
        id: "cg-1",
        userId: "1",
        name: "Test Group 1",
        description: "Group 1",
        category: "Test",
        expectations: "[]",
        weight: 1,
        maxSentences: 1,
        systemContext: "",
        promptTemplate: "Hello",
        toolIds: null,
        systemPromptIds: null,
        systemPromptSetIds: null,
        updatedAt: new Date(),
    },
    {
        id: "cg-2",
        userId: "1",
        name: "Test Group 2",
        description: "Group 2",
        category: "Test",
        expectations: "[]",
        weight: 1,
        maxSentences: 1,
        systemContext: "",
        promptTemplate: "World",
        toolIds: null,
        systemPromptIds: null,
        systemPromptSetIds: null,
        updatedAt: new Date(),
    }
];

describe("BenchmarkRunner", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedGetOllamaModels.mockResolvedValue([
            {
                id: "m-1",
                userId: "u-1",
                name: "llama3",
                details: JSON.stringify({ capabilities: ["tools"] }),
                updatedAt: new Date()
            }
        ]);
    });

    it("renders available models and context groups", async () => {
        await act(async () => {
            render(<BenchmarkRunner contextGroups={mockContextGroups} />);
        });

        await waitFor(() => {
            expect(screen.getByText("llama3")).toBeInTheDocument();
        });

        expect(screen.getByText("Test Group 1")).toBeInTheDocument();
        expect(screen.getByText("Test Group 2")).toBeInTheDocument();
    });

    it("toggles model selection", async () => {
        await act(async () => {
            render(<BenchmarkRunner contextGroups={mockContextGroups} />);
        });

        await waitFor(() => {
            expect(screen.getByText("llama3")).toBeInTheDocument();
        });

        const llamaModel = screen.getByText("llama3").closest("div[class*='cursor-pointer']");

        await act(async () => {
            fireEvent.click(llamaModel!);
        });

        expect(llamaModel?.className).toContain("bg-primary/5");
    });

    it("handles running a benchmark", async () => {
        // window.alert is used in the component
        const alertMock = jest.spyOn(window, "alert").mockImplementation(() => { });

        await act(async () => {
            render(<BenchmarkRunner contextGroups={mockContextGroups} />);
        });

        await waitFor(() => {
            expect(screen.getByText("llama3")).toBeInTheDocument();
        });

        const runBtn = screen.getByText(/Run 0 Batch Evaluations/);

        // Should be disabled initially (empty valid inputs)
        expect(runBtn).toBeDisabled();

        // Fill in name
        const nameInput = screen.getByPlaceholderText("e.g., Code Gen Comparison v1");
        await act(async () => {
            fireEvent.change(nameInput, { target: { value: "My Run" } });
        });

        // Toggle model
        const llamaModel = screen.getByText("llama3").closest("div[class*='cursor-pointer']");
        await act(async () => {
            fireEvent.click(llamaModel!);
        });

        // Toggle context group
        const group1 = screen.getByText("Test Group 1").closest("div[class*='cursor-pointer']");
        await act(async () => {
            fireEvent.click(group1!);
        });

        // Button should now be enabled and say "1 Batch Evaluations"
        expect(runBtn).toBeEnabled();
        expect(screen.getByText(/Run 1 Batch Evaluations/)).toBeInTheDocument();

        mockedRunBenchmark.mockResolvedValue("00000000-0000-0000-0000-000000000000");

        await act(async () => {
            fireEvent.click(runBtn);
        });

        expect(runBenchmark).toHaveBeenCalledWith("My Run", ["llama3"], ["cg-1"]);

        // Validate state reset (name should be empty)
        expect(nameInput).toHaveValue("");

        alertMock.mockRestore();
    });

    it("allows selecting all context groups in a category", async () => {
        await act(async () => {
            render(<BenchmarkRunner contextGroups={mockContextGroups} />);
        });

        // "Test" is the category for both mock groups
        const catSelectAll = screen.getByText(/Test \(2\)/).closest("div");

        await act(async () => {
            fireEvent.click(catSelectAll!);
        });

        // Both groups should be selected, so count should be 2, if models selected is 1, total is 2
        const llamaModel = screen.getByText("llama3").closest("div[class*='cursor-pointer']");
        await act(async () => {
            fireEvent.click(llamaModel!);
        });

        // Select all changes the button text
        const nameInput = screen.getByPlaceholderText("e.g., Code Gen Comparison v1");
        await act(async () => {
            fireEvent.change(nameInput, { target: { value: "Run All" } });
        });

        expect(screen.getByText(/Run 2 Batch Evaluations/)).toBeInTheDocument();
    });
});
