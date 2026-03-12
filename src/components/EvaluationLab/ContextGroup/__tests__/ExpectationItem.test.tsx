import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExpectationItem } from "../ExpectationItem";

describe("ExpectationItem", () => {
    const mockExpectation = { type: "contains", value: "test value" };
    const onUpdate = jest.fn();
    const onRemove = jest.fn();

    it("renders with correct values", () => {
        render(
            <ExpectationItem
                expectation={mockExpectation}
                index={0}
                onUpdate={onUpdate}
                onRemove={onRemove}
            />
        );

        expect(screen.getByDisplayValue("CONTAINS")).toBeInTheDocument();
        expect(screen.getByDisplayValue("test value")).toBeInTheDocument();
    });

    it("calls onUpdate when type changes", () => {
        render(
            <ExpectationItem
                expectation={mockExpectation}
                index={0}
                onUpdate={onUpdate}
                onRemove={onRemove}
            />
        );

        fireEvent.change(screen.getByRole("combobox"), { target: { value: "regex" } });
        expect(onUpdate).toHaveBeenCalledWith(0, "type", "regex");
    });

    it("calls onUpdate when value changes", () => {
        render(
            <ExpectationItem
                expectation={mockExpectation}
                index={0}
                onUpdate={onUpdate}
                onRemove={onRemove}
            />
        );

        fireEvent.change(screen.getByPlaceholderText("Value to check..."), { target: { value: "new value" } });
        expect(onUpdate).toHaveBeenCalledWith(0, "value", "new value");
    });

    it("calls onRemove when remove button is clicked", () => {
        render(
            <ExpectationItem
                expectation={mockExpectation}
                index={0}
                onUpdate={onUpdate}
                onRemove={onRemove}
            />
        );

        fireEvent.click(screen.getByText("×"));
        expect(onRemove).toHaveBeenCalledWith(0);
    });
});
