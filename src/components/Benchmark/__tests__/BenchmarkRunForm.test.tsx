import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { BenchmarkRunForm } from "../BenchmarkRunForm";
import { saveBenchmarkRun } from "@/app/actions/benchmarks";
import { getOllamaModels } from "@/app/actions/ollama";

jest.mock("@/app/actions/benchmarks", () => ({
    saveBenchmarkRun: jest.fn()
}));

jest.mock("@/app/actions/ollama", () => ({
    getOllamaModels: jest.fn()
}));

const mockContextGroups = [
    {
        id: "cg-1",
        name: "Test Group 1",
        description: "Group 1",
        promptTemplate: "Hello",
        category: "Test",
        createdAt: new Date(),
        updatedAt: new Date(),
        expectedSchema: null,
        weight: 1,
        userId: "user-1",
        expectations: "[]",
        maxSentences: 1,
        systemContext: "",
        isActive: true,
        source: "manual"
    }
] as unknown as import("@/types/agent").ContextGroup[];

const mockSystemPrompts = [
    {
        id: "sp-1",
        name: "Test Persona",
        content: "You are a test persona.",
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: "1"
    }
] as unknown as import("@/types/agent").SystemPrompt[];

const mockSystemPromptSets = [
    {
        id: "spset-1",
        name: "Test Set",
        description: "A test set",
        createdAt: new Date(),
        updatedAt: new Date()
    }
] as unknown as import("@/types/agent").SystemPromptSet[];

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
        (getOllamaModels as jest.Mock).mockResolvedValue([
            { name: "llama3", details: JSON.stringify({ capabilities: ["tools"] }) }
        ]);
        jest.spyOn(window, 'alert').mockImplementation(() => { });
    });

    afterEach(() => {
        (window.alert as jest.Mock).mockRestore();
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
        const initialData = {
            id: "run-1",
            name: "My Existing Run",
            models: JSON.stringify(["llama3"]),
            contextGroupIds: JSON.stringify(["cg-1"]),
            systemPromptIds: JSON.stringify(["sp-1"]),
            systemPromptSetIds: JSON.stringify(["spset-1"]),
            parallelWorkers: 5,
            description: "",
            createdAt: new Date(),
            updatedAt: new Date(),
            systemPromptId: null,
            systemPromptSetId: null
        } as unknown as import("@/types/agent").BenchmarkRun;

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

        (saveBenchmarkRun as jest.Mock).mockResolvedValue(undefined);

        const saveBtn = screen.getByText("Save Run Definition");
        await act(async () => {
            fireEvent.click(saveBtn);
        });

        expect(saveBenchmarkRun).toHaveBeenCalledWith({
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
