"use client";

import React, { useState } from "react";
import { ViewType } from "../hooks/useBenchmarkStats";
import { clearBenchmarkData } from "@/app/actions/benchmarks";

interface ViewSwitcherProps {
    currentView: ViewType;
    onViewChange: (view: ViewType) => void;
    isResetting: boolean;
    setIsResetting: (val: boolean) => void;
}

export const ViewSwitcher = ({ currentView, onViewChange, isResetting, setIsResetting }: ViewSwitcherProps) => {
    const [showConfirmReset, setShowConfirmReset] = useState(false);

    const handleReset = async () => {
        setIsResetting(true);
        setShowConfirmReset(false);
        try {
            await clearBenchmarkData();
        } catch (err) {
            console.error("Failed to reset data", err);
            alert("Failed to reset data");
        } finally {
            setIsResetting(false);
        }
    };

    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex gap-2 p-1 bg-foreground/5 rounded-xl border border-border/50 w-fit">
                {(["models", "variations"] as ViewType[]).map(view => (
                    <button
                        key={view}
                        onClick={() => onViewChange(view)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${currentView === view
                            ? "bg-background text-foreground shadow-sm border border-border/50"
                            : "text-foreground/40 hover:text-foreground/60 hover:bg-foreground/5"
                            }`}
                    >
                        {view === "variations" ? "Personas" : view}
                    </button>
                ))}
            </div>

            <div className="flex items-center gap-3">
                {showConfirmReset ? (
                    <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                        <span className="text-[10px] font-bold text-red-500/60 uppercase">Clear all results?</span>
                        <button
                            onClick={handleReset}
                            disabled={isResetting}
                            className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-[10px] font-bold uppercase transition-all hover:bg-red-600 disabled:opacity-50"
                        >
                            Yes
                        </button>
                        <button
                            onClick={() => setShowConfirmReset(false)}
                            className="px-3 py-1.5 bg-foreground/5 hover:bg-foreground/10 text-foreground/60 rounded-lg text-[10px] font-bold uppercase transition-all"
                        >
                            No
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setShowConfirmReset(true)}
                        disabled={isResetting}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-all flex items-center gap-2 w-fit disabled:opacity-50"
                    >
                        {isResetting ? (
                            <>
                                <div className="w-3 h-3 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
                                Clearing...
                            </>
                        ) : (
                            "🗑️ Reset Results"
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};
