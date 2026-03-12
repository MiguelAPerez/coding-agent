import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ContextGroupCard } from "../ContextGroupCard";
import { deleteContextGroup } from "@/app/actions/benchmarks";

// Mock the delete action
jest.mock("@/app/actions/benchmarks", () => ({
    deleteContextGroup: jest.fn(),
}));

describe("ContextGroupCard", () => {
    const mockGroup = {
        id: "123",
        userId: "u1",
        name: "Test Group",
        description: "Test Description",
        category: "Test Category",
        weight: 1.5,
        expectations: JSON.stringify([{ type: "contains", value: "test" }]),
        maxSentences: 5,
        systemContext: "system context",
        promptTemplate: "This is a test template",
        skillIds: JSON.stringify(["s1", "s2"]),
        toolIds: null,
        systemPromptIds: JSON.stringify(["p1"]),
        systemPromptSetIds: JSON.stringify(["set1"]),
        systemPromptVariations: JSON.stringify([{ id: "v1", name: "Var 1", systemPrompt: "sp" }]),
        updatedAt: new Date(),
    };
    const onEdit = jest.fn();

    it("renders group details correctly", () => {
        render(<ContextGroupCard group={mockGroup} onEdit={onEdit} />);

        expect(screen.getByText("Test Group")).toBeInTheDocument();
        expect(screen.getByText("Test Description")).toBeInTheDocument();
        expect(screen.getByText("w:1.5")).toBeInTheDocument();
        expect(screen.getByText("1 Expectations")).toBeInTheDocument();
        expect(screen.getByText("1 Manuals")).toBeInTheDocument();
        expect(screen.getByText("2 References")).toBeInTheDocument();
        expect(screen.getByText("2 Skills")).toBeInTheDocument();
        expect(screen.getByText("23 chars")).toBeInTheDocument(); // length of "This is a test template"
    });

    it("handles missing description", () => {
        const groupNoDesc = { ...mockGroup, description: null };
        render(<ContextGroupCard group={groupNoDesc} onEdit={onEdit} />);
        expect(screen.getByText("No description provided.")).toBeInTheDocument();
    });

    it("calls onEdit when edit button is clicked", () => {
        render(<ContextGroupCard group={mockGroup} onEdit={onEdit} />);
        fireEvent.click(screen.getByText("Edit"));
        expect(onEdit).toHaveBeenCalledWith(mockGroup);
    });

    it("calls deleteContextGroup when delete button is clicked", () => {
        render(<ContextGroupCard group={mockGroup} onEdit={onEdit} />);
        fireEvent.click(screen.getByText("Delete"));
        expect(deleteContextGroup).toHaveBeenCalledWith("123");
    });

    it("gracefully handles invalid JSON in fields", () => {
        const groupInvalidJson = {
            ...mockGroup,
            expectations: "invalid json",
            systemPromptVariations: "invalid json",
            systemPromptIds: "invalid json",
            skillIds: "invalid json",
        };
        // Mocking console.error to avoid spamming test output
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        render(<ContextGroupCard group={groupInvalidJson} onEdit={onEdit} />);
        
        // Should not show the counts if JSON is invalid
        expect(screen.queryByText("Expectations")).not.toBeInTheDocument();
        expect(screen.queryByText("Manuals")).not.toBeInTheDocument();
        expect(screen.queryByText("References")).not.toBeInTheDocument();
        expect(screen.queryByText("Skills")).not.toBeInTheDocument();
        
        consoleSpy.mockRestore();
    });
});
