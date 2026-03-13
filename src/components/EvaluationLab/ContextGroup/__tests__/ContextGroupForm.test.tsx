import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ContextGroupForm } from "../ContextGroupForm";
import { ContextGroupFormState } from "../types";

describe("ContextGroupForm", () => {
    const mockForm: ContextGroupFormState = {
        name: "Test Name",
        description: "Test Desc",
        category: "Test Cat",
        weight: 1,
        expectations: [{ type: "contains", value: "test" }],
        maxSentences: "",
        systemContext: "base context",
        promptTemplate: "template",
        systemPromptIds: ["p1"],
        systemPromptSetIds: ["set1"],
        systemPromptVariations: [{ id: "v1", name: "Var 1", systemPrompt: "sp" }],
    };

    const props = {
        form: mockForm,
        skills: [{ id: "s1", name: "Skill 1", description: "d", content: "c", isEnabled: true, userId: "u", agentId: null, updatedAt: new Date() }],
        prompts: [{ id: "p1", name: "Prompt 1", content: "c", userId: "u", isManaged: false, updatedAt: new Date() }],
        promptSets: [{ id: "set1", name: "Set 1", description: "d", systemPromptIds: "[]", userId: "u", updatedAt: new Date() }],
        onFieldChange: jest.fn(),
        onToggleSkill: jest.fn(),
        onAddExpectation: jest.fn(),
        onRemoveExpectation: jest.fn(),
        onUpdateExpectation: jest.fn(),
        onAddVariation: jest.fn(),
        onRemoveVariation: jest.fn(),
        onUpdateVariation: jest.fn(),
        onAddFromSet: jest.fn(),
        onAddFromLibrary: jest.fn(),
        onRemoveReference: jest.fn(),
        onSave: jest.fn(),
        onCancel: jest.fn(),
        isEditing: false,
    };

    it("renders form with initial values", () => {
        render(<ContextGroupForm {...props} />);

        expect(screen.getByDisplayValue("Test Name")).toBeInTheDocument();
        expect(screen.getByDisplayValue("Test Desc")).toBeInTheDocument();
        expect(screen.getByDisplayValue("Test Cat")).toBeInTheDocument();
        expect(screen.getByDisplayValue("base context")).toBeInTheDocument();
        expect(screen.getByDisplayValue("template")).toBeInTheDocument();
    });

    it("calls onFieldChange when input values change", () => {
        render(<ContextGroupForm {...props} />);

        fireEvent.change(screen.getByLabelText("Name"), { target: { value: "New Name" } });
        expect(props.onFieldChange).toHaveBeenCalledWith("name", "New Name");

        fireEvent.change(screen.getByLabelText("Description"), { target: { value: "New Desc" } });
        expect(props.onFieldChange).toHaveBeenCalledWith("description", "New Desc");
    });

    it("triggers onAddExpectation when button clicked", () => {
        render(<ContextGroupForm {...props} />);
        fireEvent.click(screen.getByText("+ Add Expectation"));
        expect(props.onAddExpectation).toHaveBeenCalled();
    });

    it("triggers onAddVariation when button clicked", () => {
        render(<ContextGroupForm {...props} />);
        fireEvent.click(screen.getByText("+ Manual"));
        expect(props.onAddVariation).toHaveBeenCalled();
    });

    it("triggers onAddFromSet when set selected", () => {
        render(<ContextGroupForm {...props} />);
        const select = screen.getByDisplayValue("+ From Set");
        fireEvent.change(select, { target: { value: "set1" } });
        expect(props.onAddFromSet).toHaveBeenCalledWith("set1");
    });

    it("triggers onAddFromLibrary when prompt selected", () => {
        render(<ContextGroupForm {...props} />);
        const select = screen.getByDisplayValue("+ From Library");
        fireEvent.change(select, { target: { value: "p1" } });
        expect(props.onAddFromLibrary).toHaveBeenCalledWith("p1");
    });

    it("calls onSave when form is submitted", () => {
        render(<ContextGroupForm {...props} />);
        fireEvent.submit(screen.getByLabelText("context-group-form"));
        expect(props.onSave).toHaveBeenCalled();
    });

    it("calls onCancel when cancel button is clicked", () => {
        render(<ContextGroupForm {...props} />);
        fireEvent.click(screen.getByText("Cancel"));
        expect(props.onCancel).toHaveBeenCalled();
    });

    it("renders sub-components correctly", () => {
        render(<ContextGroupForm {...props} />);

        // Check ExpectationItem
        expect(screen.getByDisplayValue("test")).toBeInTheDocument();

        // Check ReferenceItem (from set and prompt)
        // Use getAllByText and check that at least one is NOT an option (or just verify content)
        // Or check by their characteristic headers
        expect(screen.getByText("System Prompt Set Reference")).toBeInTheDocument();
        expect(screen.getByText("System Prompt Reference")).toBeInTheDocument();

        // Check VariationItem
        expect(screen.getByDisplayValue("Var 1")).toBeInTheDocument();
    });

    it("shows empty states for expectations and variations", () => {
        const emptyFormProps = {
            ...props,
            form: {
                ...mockForm,
                expectations: [],
                systemPromptIds: [],
                systemPromptSetIds: [],
                systemPromptVariations: [],
            }
        };
        render(<ContextGroupForm {...emptyFormProps} />);

        expect(screen.getByText("No expectations defined. Add one to enable automated scoring.")).toBeInTheDocument();
        expect(screen.getByText("No variations defined. Uses base system context by default.")).toBeInTheDocument();
    });
});
