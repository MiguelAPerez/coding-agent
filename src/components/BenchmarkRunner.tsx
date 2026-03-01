"use client";

import React, { useState } from "react";
import { runBenchmark } from "@/app/actions/agent";
import { ContextGroup } from "@/types/agent";

export const BenchmarkRunner = ({
    contextGroups
}: {
    contextGroups: ContextGroup[]
}) => {
    const [selectedModels, setSelectedModels] = useState<string[]>(["gpt-4o"]);
    const [selectedContextGroups, setSelectedContextGroups] = useState<string[]>([]);
    const [benchmarkName, setBenchmarkName] = useState("");
    const [isStarting, setIsStarting] = useState(false);

    const availableModels = [
        "gpt-4o",
        "gpt-4-turbo",
        "gpt-3.5-turbo",
        "claude-3-opus",
        "claude-3-sonnet",
        "gemini-1.5-pro"
    ];

    const toggleModel = (model: string) => {
        setSelectedModels(prev =>
            prev.includes(model)
                ? prev.filter(m => m !== model)
                : [...prev, model]
        );
    };

    const toggleContextGroup = (id: string) => {
        setSelectedContextGroups(prev =>
            prev.includes(id)
                ? prev.filter(i => i !== id)
                : [...prev, id]
        );
    };

    const handleRun = async () => {
        if (!benchmarkName || selectedModels.length === 0 || selectedContextGroups.length === 0) {
            alert("Please fill in all fields.");
            return;
        }

        setIsStarting(true);
        try {
            await runBenchmark(benchmarkName, selectedModels, selectedContextGroups);
            setBenchmarkName("");
            setSelectedContextGroups([]);
            // The simulation/polling will be handled by the parent
        } catch {
            alert("Failed to start benchmark.");
        } finally {
            setIsStarting(false);
        }
    };

    return (
        <div className="glass p-8 rounded-3xl border border-border/50 space-y-8 animate-in fade-in zoom-in-95 duration-500">
            <div className="space-y-2">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    Create New Benchmark
                </h2>
                <p className="text-sm text-foreground/40">
                    Select models and context groups to compare performance and efficiency.
                </p>
            </div>

            <div className="space-y-6">
                <div className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-widest text-foreground/30 px-1">Benchmark Name</label>
                    <input
                        className="w-full bg-background/50 border border-border/50 rounded-2xl px-6 py-4 focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all outline-none text-lg font-medium"
                        placeholder="e.g., Code Gen Comparison v1"
                        value={benchmarkName}
                        onChange={e => setBenchmarkName(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <label className="text-xs font-bold uppercase tracking-widest text-foreground/30 px-1">Select Models</label>
                        <div className="grid grid-cols-1 gap-2">
                            {availableModels.map(model => (
                                <div
                                    key={model}
                                    onClick={() => toggleModel(model)}
                                    className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${selectedModels.includes(model)
                                            ? "bg-primary/5 border-primary/40 text-primary shadow-sm"
                                            : "bg-background/20 border-border/50 hover:border-foreground/10 text-foreground/60"
                                        }`}
                                >
                                    <span className="text-sm font-medium">{model}</span>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedModels.includes(model) ? "bg-primary border-primary" : "border-border/50"
                                        }`}>
                                        {selectedModels.includes(model) && (
                                            <div className="w-1.5 h-1.5 bg-background rounded-full" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-xs font-bold uppercase tracking-widest text-foreground/30 px-1">Context Groups</label>
                        {contextGroups.length === 0 ? (
                            <div className="h-full flex items-center justify-center border-2 border-dashed border-border/30 rounded-3xl p-8 text-center text-foreground/20 italic">
                                No context groups found. Create one in the Context Groups tab first.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-2">
                                {contextGroups.map(group => (
                                    <div
                                        key={group.id}
                                        onClick={() => toggleContextGroup(group.id)}
                                        className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${selectedContextGroups.includes(group.id)
                                                ? "bg-primary/5 border-primary/40 text-primary shadow-sm"
                                                : "bg-background/20 border-border/50 hover:border-foreground/10 text-foreground/60"
                                            }`}
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium truncate max-w-[150px]">{group.name}</span>
                                            <span className="text-[10px] opacity-60">Template: {group.promptTemplate.slice(0, 20)}...</span>
                                        </div>
                                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${selectedContextGroups.includes(group.id) ? "bg-primary border-primary" : "border-border/50"
                                            }`}>
                                            {selectedContextGroups.includes(group.id) && (
                                                <div className="w-2 h-2 bg-background rounded-sm rotate-45" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <button
                    onClick={handleRun}
                    disabled={isStarting || !benchmarkName || selectedModels.length === 0 || selectedContextGroups.length === 0}
                    className="w-full py-5 bg-primary text-primary-foreground rounded-2xl font-bold text-lg hover:opacity-90 disabled:opacity-50 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 mt-4"
                >
                    {isStarting ? (
                        <>
                            <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                            Initializing...
                        </>
                    ) : (
                        <>
                            <span className="text-xl">🚀</span>
                            Run {selectedModels.length * selectedContextGroups.length} Batch Evaluations
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
