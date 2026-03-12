import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { BenchmarkRunForm } from "../BenchmarkRunForm";
import { saveBenchmarkRun } from "@/app/actions/benchmarks";
import { getOllamaModels } from "@/app/actions/ollama";
import { ContextGroup, SystemPrompt, SystemPromptSet, BenchmarkRun } from "@/types/agent";

jest.mock("@/app/actions/benchmarks", () => ({
    saveBenchmarkRun: jest.fn()
}));

jest.mock("@/app/actions/ollama", () => ({
    getOllamaModels: jest.fn()
}));

const mockedSaveBenchmarkRun = jest.mocked(saveBenchmarkRun);
const mockedGetOllamaModels = jest.mocked(getOllamaModels);

const mockContextGroups: ContextGroup[] = [
    {
        id: "cg-1",
        userId: "user-1",
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
    }
];

const mockSystemPrompts: SystemPrompt[] = [
    {
        id: "sp-1",
        userId: "1",
        name: "Test Persona",
        content: "You are a test persona.",
        updatedAt: new Date(),
    }
];

const mockSystemPromptSets: SystemPromptSet[] = [
    {
        id: "spset-1",
        userId: "1",
        name: "Test Set",
        description: "A test set",
        systemPromptIds: JSON.stringify(["sp-1"]),
        updatedAt: new Date(),
    }
];

describe("BenchmarkRunForm", () => {
    const defaultProps = {
        contextGroups: mockContextGroups,
        systemPrompts: mockSystemPrompts,
        systemPromptSets: mockSystemPromptSets,
        onSuccess: jest.fn(),
        onCancel: jest.fn()
    };

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
        jest.spyOn(window, 'alert').mockImplementation(() => { });
    });

    afterEach(() => {
        jest.mocked(window.alert).mockRestore();
    });

    it("renders available models, context groups, personas, and persona sets", async () => {
        await act(async () => {
            render(<BenchmarkRunForm {...defaultProps} />);
        });

        await waitFor(() => {
            expect(screen.getByText("llama3")).toBeInTheDocument();
        });

        expect(screen.getByText("Test Group 1")).toBeInTheDocument();
        expect(screen.getByText("Test Persona")).toBeInTheDocument();
        expect(screen.getByText("Test Set")).toBeInTheDocument();
    });

    it("populates fields if initialData is provided", async () => {
        const initialData: BenchmarkRun = {
            id: "run-1",
            userId: "1",
            name: "My Existing Run",
            description: "",
            models: JSON.stringify(["llama3"]),
            contextGroupIds: JSON.stringify(["cg-1"]),
            systemPromptIds: JSON.stringify(["sp-1"]),
            systemPromptSetIds: JSON.stringify(["spset-1"]),
            parallelWorkers: 5,
            updatedAt: new Date(),
        };

        await act(async () => {
            render(<BenchmarkRunForm {...defaultProps} initialData={initialData} />);
        });

        expect(screen.getByDisplayValue("My Existing Run")).toBeInTheDocument();
        expect(screen.getByDisplayValue("5")).toBeInTheDocument();

        await act(async () => {
            // Check that the selected items have the "selected" visual state (in Tailwind, usually bg-primary/5 or similar)
            const llamaModel = await screen.findByText("llama3");
            const modelDiv = llamaModel.closest("div[class*='cursor-pointer']");
            expect(modelDiv?.className).toContain("bg-primary/5");
        });

        const cg = screen.getByText("Test Group 1").closest("div[class*='cursor-pointer']");
        expect(cg?.className).toContain("bg-primary/5");

        const sp = screen.getByText("Test Persona").closest("div[class*='cursor-pointer']");
        expect(sp?.className).toContain("bg-primary/5");

        const spSet = screen.getByText("Test Set").closest("div[class*='cursor-pointer']");
        expect(spSet?.className).toContain("bg-purple-500/5"); // purple for system prompt sets
    });

    it("handles form submission", async () => {
        await act(async () => {
            render(<BenchmarkRunForm {...defaultProps} />);
        });

        await waitFor(() => {
            expect(screen.getByText("llama3")).toBeInTheDocument();
        });

        // Fill Name
        const nameInput = screen.getByPlaceholderText("e.g., Code Gen Comparison v1");
        await act(async () => {
            fireEvent.change(nameInput, { target: { value: "New Run" } });
        });

        // Set Parallel Workers
        const workersInput = screen.getByDisplayValue("1");
        await act(async () => {
            fireEvent.change(workersInput, { target: { value: "3" } });
        });

        // Select Model
        const llamaModel = screen.getByText("llama3").closest("div[class*='cursor-pointer']");
        await act(async () => {
            fireEvent.click(llamaModel!);
        });

        // Select Context Group
        const cg = screen.getByText("Test Group 1").closest("div[class*='cursor-pointer']");
        await act(async () => {
            fireEvent.click(cg!);
        });

        // Select System Prompt
        const sp = screen.getByText("Test Persona").closest("div[class*='cursor-pointer']");
        await act(async () => {
            fireEvent.click(sp!);
        });

        mockedSaveBenchmarkRun.mockResolvedValue(undefined);

        const saveBtn = screen.getByText("Save Run Definition");
        await act(async () => {
            fireEvent.click(saveBtn);
        });

        expect(mockedSaveBenchmarkRun).toHaveBeenCalledWith({
            id: undefined,
            name: "New Run",
            models: ["llama3"],
            contextGroupIds: ["cg-1"],
            systemPromptIds: ["sp-1"],
            systemPromptSetIds: [],
            parallelWorkers: 3
        });

        expect(defaultProps.onSuccess).toHaveBeenCalled();
    });

    it("calls onCancel when cancel is clicked", async () => {
        await act(async () => {
            render(<BenchmarkRunForm {...defaultProps} />);
        });

        // There are two cancel buttons: top X and bottom Cancel
        const bottomCancel = screen.getByText("Cancel");
        await act(async () => {
            fireEvent.click(bottomCancel);
        });

        expect(defaultProps.onCancel).toHaveBeenCalled();
    });

    it("validates empty submission", async () => {
        await act(async () => {
            render(<BenchmarkRunForm {...defaultProps} />);
        });

        const saveBtn = screen.getByText("Save Run Definition");

        expect(saveBtn).toBeDisabled();
        expect(saveBenchmarkRun).not.toHaveBeenCalled();
    });

    it("restricts parallel workers max 20, min 1", async () => {
        await act(async () => {
            render(<BenchmarkRunForm {...defaultProps} />);
        });

        const workersInput = screen.getByDisplayValue("1");

        await act(async () => {
            fireEvent.change(workersInput, { target: { value: "50" } });
        });
        expect(workersInput).toHaveValue(20);

        await act(async () => {
            fireEvent.change(workersInput, { target: { value: "-5" } });
        });
        expect(workersInput).toHaveValue(1);
    });
});
