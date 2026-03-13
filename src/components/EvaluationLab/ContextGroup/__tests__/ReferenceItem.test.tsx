import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReferenceItem } from "../ReferenceItem";

describe("ReferenceItem", () => {
    const prompts = [{ id: "p1", name: "Prompt 1", content: "content", userId: "u1", isManaged: false, updatedAt: new Date() }];
    const promptSets = [{ id: "s1", name: "Set 1", description: "desc", systemPromptIds: "[]", userId: "u1", updatedAt: new Date() }];
    const onRemove = jest.fn();

    it("renders prompt reference correctly", () => {
        render(
            <ReferenceItem
                id="p1"
                type="prompt"
                prompts={prompts}
                promptSets={promptSets}
                onRemove={onRemove}
            />
        );

        expect(screen.getByText("Prompt 1")).toBeInTheDocument();
        expect(screen.getByText("System Prompt Reference")).toBeInTheDocument();
    });

    it("renders set reference correctly", () => {
        render(
            <ReferenceItem
                id="s1"
                type="set"
                prompts={prompts}
                promptSets={promptSets}
                onRemove={onRemove}
            />
        );

        expect(screen.getByText("Set 1")).toBeInTheDocument();
        expect(screen.getByText("System Prompt Set Reference")).toBeInTheDocument();
    });

    it("calls onRemove when remove button is clicked", () => {
        render(
            <ReferenceItem
                id="p1"
                type="prompt"
                prompts={prompts}
                promptSets={promptSets}
                onRemove={onRemove}
            />
        );

        fireEvent.click(screen.getByText("×"));
        expect(onRemove).toHaveBeenCalledWith("p1", "prompt");
    });
});
