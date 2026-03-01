"use client";

import React, { useState } from "react";
import { triggerBenchmark, deleteBenchmarkRun } from "@/app/actions/agent";
import { BenchmarkRun, ContextGroup } from "@/types/agent";
import { BenchmarkRunForm } from "./BenchmarkRunForm";

export const BenchmarkRunManager = ({
    initialRuns,
    contextGroups,
    onBenchmarkStarted
}: {
    initialRuns: BenchmarkRun[];
    contextGroups: ContextGroup[];
    onBenchmarkStarted: (benchmarkId: string) => void;
}) => {
    const [runs, setRuns] = useState<BenchmarkRun[]>(initialRuns);
    const [isAddingRun, setIsAddingRun] = useState(false);
    const [editingRun, setEditingRun] = useState<BenchmarkRun | null>(null);
    const [isTriggering, setIsTriggering] = useState<string | null>(null);

    const handleTrigger = async (runId: string) => {
        setIsTriggering(runId);
        try {
            const benchmarkId = await triggerBenchmark(runId);
            onBenchmarkStarted(benchmarkId);
        } catch {
            alert("Failed to trigger benchmark.");
        } finally {
            setIsTriggering(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this run definition?")) return;
        try {
            await deleteBenchmarkRun(id);
            setRuns(prev => prev.filter(r => r.id !== id));
        } catch (err) {
            alert("Failed to delete run definition.");
        }
    };

    if (isAddingRun || editingRun) {
        return (
            <BenchmarkRunForm
                contextGroups={contextGroups}
                initialData={editingRun || undefined}
                onSuccess={() => {
                    setIsAddingRun(false);
                    setEditingRun(null);
                    // In a real app, we'd refresh the list here. 
                    // Since it's a server action with revalidatePath, it might need a window.location.reload() 
                    // or a parent state update if we were more sophisticated.
                    window.location.reload();
                }}
                onCancel={() => {
                    setIsAddingRun(false);
                    setEditingRun(null);
                }}
            />
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <h3 className="text-xl font-bold text-foreground">Defined Runs</h3>
                    <p className="text-sm text-foreground/40">Manage and trigger your predefined evaluation runs.</p>
                </div>
                <button
                    onClick={() => setIsAddingRun(true)}
                    className="px-6 py-3 bg-primary text-primary-foreground rounded-2xl font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                >
                    <span className="text-xl">+</span>
                    New Run
                </button>
            </div>

            {runs.length === 0 ? (
                <div className="glass p-12 rounded-3xl border border-border/50 text-center space-y-4">
                    <div className="text-4xl">📁</div>
                    <div className="space-y-2">
                        <p className="text-lg font-medium text-foreground/60">No runs defined yet</p>
                        <p className="text-sm text-foreground/30">Create a run definition to easily benchmark multiple models.</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {runs.map(run => {
                        const models = JSON.parse(run.models) as string[];
                        const cgIds = JSON.parse(run.contextGroupIds) as string[];

                        return (
                            <div key={run.id} className="glass p-6 rounded-3xl border border-border/50 hover:border-primary/30 transition-all group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="space-y-1">
                                        <h4 className="text-lg font-bold text-foreground">{run.name}</h4>
                                        <div className="flex flex-wrap gap-2">
                                            <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-md uppercase">
                                                {models.length} Models
                                            </span>
                                            <span className="px-2 py-0.5 bg-foreground/5 text-foreground/40 text-[10px] font-bold rounded-md uppercase">
                                                {cgIds.length} Groups
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setEditingRun(run)}
                                            className="p-2 hover:bg-primary/10 rounded-xl transition-all text-foreground/30 hover:text-primary"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={() => handleDelete(run.id)}
                                            className="p-2 hover:bg-destructive/10 rounded-xl transition-all text-foreground/30 hover:text-destructive"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleTrigger(run.id)}
                                    disabled={isTriggering === run.id}
                                    className="w-full py-3 bg-foreground/5 hover:bg-primary hover:text-primary-foreground text-foreground/60 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                                >
                                    {isTriggering === run.id ? (
                                        <div className="w-4 h-4 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
                                    ) : (
                                        "🚀 Run Now"
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
