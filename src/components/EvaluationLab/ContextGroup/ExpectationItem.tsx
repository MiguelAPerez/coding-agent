import React from "react";
import { Expectation } from "./types";

interface ExpectationItemProps {
    expectation: Expectation;
    index: number;
    onUpdate: (index: number, field: keyof Expectation, value: string) => void;
    onRemove: (index: number) => void;
}

export const ExpectationItem = ({ expectation, index, onUpdate, onRemove }: ExpectationItemProps) => {
    return (
        <div className="flex gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
            <select
                className="bg-background border border-border rounded-xl px-2 py-2 text-xs font-mono"
                value={expectation.type}
                onChange={e => onUpdate(index, "type", e.target.value)}
            >
                <option value="contains">CONTAINS</option>
                <option value="not_contains">NOT_CONTAINS</option>
                <option value="regex">REGEX</option>
                <option value="exact">EXACT</option>
            </select>
            <input
                className="flex-1 bg-background border border-border rounded-xl px-4 py-2 text-sm font-mono"
                value={expectation.value}
                onChange={e => onUpdate(index, "value", e.target.value)}
                placeholder={expectation.type === "regex" ? "/pattern/i" : "Value to check..."}
            />
            <button
                type="button"
                onClick={() => onRemove(index)}
                className="p-2 text-foreground/20 hover:text-destructive transition-colors"
            >
                <span className="text-lg">×</span>
            </button>
        </div>
    );
};
