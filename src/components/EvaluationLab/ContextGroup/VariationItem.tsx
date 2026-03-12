import React from "react";
import { Variation } from "./types";

interface VariationItemProps {
    variation: Variation;
    onUpdate: (id: string, field: keyof Variation, value: string) => void;
    onRemove: (id: string) => void;
}

export const VariationItem = ({ variation, onUpdate, onRemove }: VariationItemProps) => {
    return (
        <div className="glass p-4 rounded-xl border border-purple-500/20 space-y-3 animate-in fade-in slide-in-from-left-2 duration-200">
            <div className="flex justify-between items-center gap-2">
                <div className="flex items-center gap-3 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-500">✍️</div>
                    <input
                        className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-bold"
                        value={variation.name}
                        onChange={e => onUpdate(variation.id, "name", e.target.value)}
                        placeholder="Variation Name (Manual)"
                    />
                </div>
                <button
                    type="button"
                    onClick={() => onRemove(variation.id)}
                    className="p-1 text-foreground/20 hover:text-destructive transition-colors"
                >
                    <span className="text-lg">×</span>
                </button>
            </div>
            <textarea
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs min-h-[80px] font-mono"
                value={variation.systemPrompt}
                onChange={e => onUpdate(variation.id, "systemPrompt", e.target.value)}
                placeholder="System prompt for this manual variation..."
            />
        </div>
    );
};
