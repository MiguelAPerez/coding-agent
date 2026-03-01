"use client";

import React, { useState } from "react";
import { triggerBenchmark, deleteBenchmarkRun, getActiveBenchmarks } from "@/app/actions/agent";
import { BenchmarkRun, ContextGroup, Benchmark } from "@/types/agent";
import { BenchmarkRunForm } from "./BenchmarkRunForm";
import { useRouter } from "next/navigation";

export const BenchmarkRunManager = ({
    initialRuns,
    contextGroups,
    onBenchmarkStarted,
    initialActiveBenchmarks = []
}: {
    initialRuns: BenchmarkRun[];
    contextGroups: ContextGroup[];
    onBenchmarkStarted: (benchmarkId: string) => void;
    initialActiveBenchmarks?: Benchmark[];
}) => {
    const [runs, setRuns] = useState<BenchmarkRun[]>(initialRuns);
    const [isAddingRun, setIsAddingRun] = useState(false);
    const [editingRun, setEditingRun] = useState<BenchmarkRun | null>(null);
    const [isTriggering, setIsTriggering] = useState<string | null>(null);
    const [activeBenchmarks, setActiveBenchmarks] = useState<Benchmark[]>(initialActiveBenchmarks);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const router = useRouter();

    React.useEffect(() => {
        setRuns(initialRuns);
    }, [initialRuns]);

    React.useEffect(() => {
        const interval = setInterval(async () => {
            const latestActive = await getActiveBenchmarks() as Benchmark[];
            setActiveBenchmarks(prev => {
                const currentIds = new Set(latestActive.map(b => b.id));
                const hasFinishedRuns = prev.some(b => !currentIds.has(b.id));

                if (hasFinishedRuns) {
                    router.refresh();
                }

                return latestActive;
            });
        }, 3000);
        return () => clearInterval(interval);
    }, [router]);

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
        setIsDeleting(id);
        setConfirmDeleteId(null);
        try {
            await deleteBenchmarkRun(id);
            setRuns(prev => prev.filter(r => r.id !== id));
            router.refresh();
        } catch (err) {
            console.error("Failed to delete run definition", err);
            alert("Failed to delete run definition.");
        } finally {
            setIsDeleting(null);
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
                    router.push("/evaluation-lab?tab=runs");
                    router.refresh();
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
                                        {confirmDeleteId === run.id ? (
                                            <div className="flex items-center gap-1 animate-in fade-in zoom-in-95 duration-200">
                                                <button
                                                    onClick={() => handleDelete(run.id)}
                                                    disabled={isDeleting === run.id}
                                                    className="p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all text-xs font-bold disabled:opacity-50"
                                                >
                                                    {isDeleting === run.id ? "..." : "Delete"}
                                                </button>
                                                <button
                                                    onClick={() => setConfirmDeleteId(null)}
                                                    className="p-2 hover:bg-foreground/10 rounded-xl transition-all text-foreground/40 text-xs font-bold"
                                                >
                                                    Esc
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => setEditingRun(run)}
                                                    className="p-2 hover:bg-primary/10 rounded-xl transition-all text-foreground/30 hover:text-primary"
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    onClick={() => setConfirmDeleteId(run.id)}
                                                    className="p-2 hover:bg-destructive/10 rounded-xl transition-all text-foreground/30 hover:text-destructive"
                                                >
                                                    🗑️
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Active Benchmark Progress Bars */}
                                {activeBenchmarks.filter(b => b.runId === run.id).map(activeBench => {
                                    const progress = activeBench.totalEntries > 0
                                        ? (activeBench.completedEntries / activeBench.totalEntries) * 100
                                        : 0;

                                    return (
                                        <div key={activeBench.id} onClick={() => onBenchmarkStarted(activeBench.id)} className="w-full mb-4 cursor-pointer group/progress">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-primary group-hover/progress:text-primary/70">{activeBench.name} - In Progress</span>
                                                <span className="text-[10px] font-bold font-mono text-foreground/60">{Math.round(progress)}%</span>
                                            </div>
                                            <div className="w-full bg-foreground/5 h-2 rounded-full overflow-hidden border border-border/30">
                                                <div
                                                    className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-1000 shadow-lg shadow-primary/20"
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}

                                <button
                                    onClick={() => handleTrigger(run.id)}
                                    disabled={isTriggering === run.id}
                                    className="w-full py-3 bg-foreground/5 hover:bg-primary hover:text-primary-foreground text-foreground/60 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                                >
                                    {isTriggering === run.id ? (
                                        <div className="w-4 h-4 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
                                    ) : activeBenchmarks.some(b => b.runId === run.id) ? (
                                        "🚀 Run Another"
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
