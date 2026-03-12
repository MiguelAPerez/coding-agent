import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { VariationItem } from "../VariationItem";

describe("VariationItem", () => {
    const mockVariation = { id: "v1", name: "variation 1", systemPrompt: "system prompt 1" };
    const onUpdate = jest.fn();
    const onRemove = jest.fn();

    it("renders with correct values", () => {
        render(
            <VariationItem
                variation={mockVariation}
                onUpdate={onUpdate}
                onRemove={onRemove}
            />
        );

        expect(screen.getByDisplayValue("variation 1")).toBeInTheDocument();
        expect(screen.getByDisplayValue("system prompt 1")).toBeInTheDocument();
    });

    it("calls onUpdate when name changes", () => {
        render(
            <VariationItem
                variation={mockVariation}
                onUpdate={onUpdate}
                onRemove={onRemove}
            />
        );

        fireEvent.change(screen.getByPlaceholderText("Variation Name (Manual)"), { target: { value: "new name" } });
        expect(onUpdate).toHaveBeenCalledWith("v1", "name", "new name");
    });

    it("calls onUpdate when systemPrompt changes", () => {
        render(
            <VariationItem
                variation={mockVariation}
                onUpdate={onUpdate}
                onRemove={onRemove}
            />
        );

        fireEvent.change(screen.getByPlaceholderText("System prompt for this manual variation..."), { target: { value: "new prompt" } });
        expect(onUpdate).toHaveBeenCalledWith("v1", "systemPrompt", "new prompt");
    });

    it("calls onRemove when remove button is clicked", () => {
        render(
            <VariationItem
                variation={mockVariation}
                onUpdate={onUpdate}
                onRemove={onRemove}
            />
        );

        fireEvent.click(screen.getByText("×"));
        expect(onRemove).toHaveBeenCalledWith("v1");
    });
});
