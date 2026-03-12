import React from "react";
import { render, screen, act } from "@testing-library/react";
import { LiveTimer } from "../LiveTimer";

describe("LiveTimer", () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it("renders initial elapsed time as 0.0s", () => {
        const startedAt = new Date();
        render(<LiveTimer startedAt={startedAt} />);
        expect(screen.getByText("0.0s")).toBeInTheDocument();
    });

    it("updates elapsed time every 100ms", () => {
        const startedAt = new Date(Date.now() - 500); // Started 500ms ago
        render(<LiveTimer startedAt={startedAt} />);
        
        // Initial render will use Date.now() which is mocked/controlled by fake timers
        // It immediately shows the difference.
        
        act(() => {
            jest.advanceTimersByTime(100);
        });

        // Date.now() advances, difference should be 600ms -> 0.6s
        expect(screen.getByText("0.6s")).toBeInTheDocument();

        act(() => {
            jest.advanceTimersByTime(1000);
        });

        // Total 1600ms -> 1.6s
        expect(screen.getByText("1.6s")).toBeInTheDocument();
    });

    it("does not go below 0 if startedAt is in the future", () => {
        const futureDate = new Date(Date.now() + 10000);
        render(<LiveTimer startedAt={futureDate} />);
        
        act(() => {
            jest.advanceTimersByTime(100);
        });

        expect(screen.getByText("0.0s")).toBeInTheDocument();
    });

    it("handles string date inputs", () => {
        const startedAt = new Date(Date.now() - 1000).toISOString();
        render(<LiveTimer startedAt={startedAt} />);
        
        act(() => {
            jest.advanceTimersByTime(100);
        });

        // About 1.1s
        expect(screen.getByText("1.1s")).toBeInTheDocument();
    });
});
