import React from "react";

export type Repo = {
    id: string;
    name: string;
    fullName: string;
    language: string | null;
    enabled: boolean;
    updatedAt: number;
};

export function RepoChip({ repo, selected, onToggle }: { repo: Repo; selected: boolean; onToggle: () => void }) {
    const isDisabled = repo.enabled === false;
    return (
        <button
            type="button"
            onClick={isDisabled ? undefined : onToggle}
            disabled={isDisabled}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-150 ${isDisabled
                    ? "opacity-40 grayscale cursor-not-allowed bg-foreground/5 border-border text-foreground/40"
                    : selected
                        ? "bg-primary/15 border-primary/50 text-primary shadow-sm shadow-primary/10"
                        : "bg-foreground/5 border-border text-foreground/50 hover:border-foreground/30 hover:text-foreground/70"
                }`}
            title={isDisabled ? "Repository is disabled" : undefined}
        >
            <div className={`w-1.5 h-1.5 rounded-full ${isDisabled ? "bg-foreground/20" : selected ? "bg-primary" : "bg-foreground/30"}`} />
            {repo.name}
            {isDisabled && <span className="text-[10px] ml-0.5 opacity-60">(off)</span>}
        </button>
    );
}
