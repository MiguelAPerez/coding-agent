"use client";

import React, { useEffect, useState } from "react";
import { getBenchmarkProgress, simulateBenchmarkStep } from "@/app/actions/agent";
import { Benchmark, BenchmarkEntry } from "@/types/agent";

export const BenchmarkProgress = ({
    initialBenchmarkId
}: {
    initialBenchmarkId: string | null
}) => {
    const [benchmark, setBenchmark] = useState<(Benchmark & { entries: BenchmarkEntry[] }) | null>(null);

    useEffect(() => {
        if (!initialBenchmarkId) return;

        const fetchData = async () => {
            const data = await getBenchmarkProgress(initialBenchmarkId);
            setBenchmark(data as (Benchmark & { entries: BenchmarkEntry[] }) | null);
        };


        fetchData();
        const interval = setInterval(fetchData, 3000);
        return () => clearInterval(interval);
    }, [initialBenchmarkId]);

    // Simulate progress if it's running
    useEffect(() => {
        if (benchmark?.status === "running") {
            const timer = setTimeout(async () => {
                const res = await simulateBenchmarkStep(benchmark.id);
                if (res.finished) {
                    // Refresh data
                    const data = await getBenchmarkProgress(benchmark.id);
                    setBenchmark(data as (Benchmark & { entries: BenchmarkEntry[] }) | null);
                }

            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [benchmark]);

    if (!benchmark && initialBenchmarkId) {
        return <div className="p-8 text-center text-foreground/40 italic">Loading benchmark progress...</div>;
    }

    if (!benchmark) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-12 glass border-2 border-dashed border-border/30 rounded-3xl text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-foreground/5 flex items-center justify-center">
                    <span className="text-3xl grayscale">📊</span>
                </div>
                <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-foreground/60">No Active Benchmark</h3>
                    <p className="text-sm text-foreground/20 max-w-xs mx-auto">
                        Head over to the &quot;Runner&quot; tab to launch multiple model evaluations simultaneously.
                    </p>
                </div>
            </div>
        );
    }

    const progress = (benchmark.completedEntries / benchmark.totalEntries) * 100;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="glass p-8 rounded-3xl border border-primary/20 shadow-2xl bg-gradient-to-br from-background/40 to-primary/5">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <span className={`w-3 h-3 rounded-full animate-pulse ${benchmark.status === "running" ? "bg-green-500 shadow-green-500/50" : "bg-primary shadow-primary/50"
                                }`} />
                            <h2 className="text-2xl font-bold text-foreground/90">{benchmark.name}</h2>
                        </div>
                        <p className="text-sm text-foreground/40 font-mono uppercase tracking-widest pl-6">
                            ID: {benchmark.id.slice(0, 8)}... • Status: {benchmark.status}
                        </p>
                    </div>
                    <div className="text-right px-6 py-4 glass bg-background/40 rounded-2xl border border-border/50">
                        <span className="text-3xl font-black text-primary font-mono">{Math.round(progress)}%</span>
                        <p className="text-[10px] font-bold uppercase tracking-tighter text-foreground/30">Total Progress</p>
                    </div>
                </div>

                <div className="w-full bg-foreground/5 h-4 rounded-full overflow-hidden mb-4 p-1 border border-border/30">
                    <div
                        className="h-full bg-gradient-to-r from-primary via-primary/80 to-primary/40 rounded-full transition-all duration-1000 shadow-lg shadow-primary/20"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className="flex justify-between px-2">
                    <span className="text-xs font-bold text-foreground/30 uppercase tracking-widest">
                        {benchmark.completedEntries} / {benchmark.totalEntries} Evaluated
                    </span>
                    <span className="text-xs font-bold text-foreground/30 uppercase tracking-widest italic">
                        Estimated time remaining: {benchmark.status === "running" ? `${(benchmark.totalEntries - benchmark.completedEntries) * 3}s` : "0s"}
                    </span>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/40 flex items-center gap-2">
                    Evaluation Queue
                    <span className="w-2 h-2 rounded-full bg-foreground/10" />
                </h3>
                <div className="grid grid-cols-1 gap-3">
                    {benchmark.entries.map((entry, idx) => (
                        <div
                            key={entry.id}
                            className={`glass p-4 rounded-2xl border transition-all flex items-center justify-between group ${entry.status === "running"
                                ? "border-primary/50 bg-primary/5 scale-[1.01] shadow-xl"
                                : entry.status === "completed"
                                    ? "border-green-500/20 opacity-80"
                                    : "border-border/30 opacity-50"
                                }`}
                        >
                            <div className="flex items-center gap-5">
                                <div className="w-8 h-8 rounded-xl bg-foreground/5 flex items-center justify-center font-mono text-xs font-bold text-foreground/30 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                                    {(idx + 1).toString().padStart(2, '0')}
                                </div>
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-foreground/80">{entry.model}</span>
                                        <span className="text-[10px] text-foreground/20 font-mono">/</span>
                                        <span className="text-xs text-foreground/40 font-medium">Context Group {entry.contextGroupId.slice(0, 4)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${entry.status === "running" ? "text-primary animate-pulse" :
                                            entry.status === "completed" ? "text-green-500/60" : "text-foreground/20"
                                            }`}>
                                            {entry.status}
                                        </span>
                                        {entry.duration && (
                                            <span className="text-[10px] text-foreground/20 font-mono">
                                                Took {entry.duration}ms
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                {entry.status === "running" && (
                                    <div className="flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                                        <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                                        <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                                    </div>
                                )}
                                {entry.status === "completed" && (
                                    <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center">
                                        <span className="text-green-500 text-xs">✓</span>
                                    </div>
                                )}
                                {entry.status === "pending" && (
                                    <div className="w-6 h-6 rounded-full bg-foreground/5 flex items-center justify-center">
                                        <span className="text-foreground/20 text-[10px]">…</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
