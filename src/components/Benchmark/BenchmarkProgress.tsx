"use client";

import React, { useEffect, useState } from "react";
import { getBenchmarkProgress, cancelBenchmark } from "@/app/actions/benchmarks";
import { Benchmark, BenchmarkEntry, ContextGroup } from "@/types/agent";
import { useRouter } from "next/navigation";
import { getOllamaModels } from "@/app/actions/ollama";
import { EvaluationQueue } from "./EvaluationQueue";
import { EntryDetails } from "./EntryDetails";

export const BenchmarkProgress = ({
    initialBenchmarkId,
    contextGroups
}: {
    initialBenchmarkId: string | null;
    contextGroups: ContextGroup[];
}) => {
    const [benchmark, setBenchmark] = useState<(Benchmark & { entries: BenchmarkEntry[] }) | null>(null);
    const [isLoading, setIsLoading] = useState(!!initialBenchmarkId);
    const [modelCapabilities, setModelCapabilities] = useState<Record<string, string[]>>({});
    const [isCancelling, setIsCancelling] = useState(false);
    const [showConfirmCancel, setShowConfirmCancel] = useState(false);
    const router = useRouter();

    useEffect(() => {
        async function loadCapabilities() {
            try {
                const models = await getOllamaModels();
                const caps: Record<string, string[]> = {};
                models.forEach(m => {
                    try {
                        if (m.details) {
                            const parsed = JSON.parse(m.details);
                            caps[m.name] = parsed.capabilities || [];
                        }
                    } catch { }
                });
                setModelCapabilities(caps);
            } catch (err) {
                console.error("Failed to load capabilities", err);
            }
        }
        loadCapabilities();
    }, []);

    useEffect(() => {
        if (!initialBenchmarkId) return;

        const fetchData = async () => {
            const data = await getBenchmarkProgress(initialBenchmarkId) as (Benchmark & { entries: BenchmarkEntry[] }) | null;
            setBenchmark(data);
            setIsLoading(false);
        };

        fetchData();
        const interval = setInterval(fetchData, 5000); // Increased from 3000ms to 5000ms
        return () => clearInterval(interval);
    }, [initialBenchmarkId]);

    // Refresh server state once when benchmark completes
    useEffect(() => {
        if (benchmark?.status === "completed") {
            router.refresh();
        }
    }, [benchmark?.status, router]);

    // Simulate progress if it's running
    const activeFetches = React.useRef(0);
    useEffect(() => {
        let isActive = true;
        let timeoutId: NodeJS.Timeout;

        const checkAndSpawn = () => {
            if (!isActive || benchmark?.status !== "running") return;
            
            const limit = benchmark.parallelWorkers || 1;
            
            while (activeFetches.current < limit) {
                activeFetches.current++;
                
                // Fire and forget fetch loop
                (async () => {
                    let shouldContinue = true;
                    try {
                        const response = await fetch('/api/benchmark/step', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ benchmarkId: benchmark.id })
                        });
                        const result = await response.json();
                        
                        if (result.finished) {
                            // Backend reports no more work to do for this loop, so we stop checking.
                            shouldContinue = false;
                        } else if (result.throttled) {
                            // Too many parallel workers; need to step back
                            await new Promise(r => setTimeout(r, 4000)); // Increased from 2000ms
                        } else if (!result.entry) {
                            // Request claimed by another worker, brief pause to stagger
                            await new Promise(r => setTimeout(r, 2000)); // Increased from 500ms
                        }
                        
                        // Deep update of the local state with the returned entry
                        if (isActive && result.entry) {
                            setBenchmark(prev => {
                                if (!prev) return null;
                                return {
                                    ...prev,
                                    entries: prev.entries.map(e => e.id === result.entry.id ? result.entry : e)
                                };
                            });
                        }
                    } catch (err) {
                        console.error("Fetch step err:", err);
                        // Brief pause on error so we don't spam if backend is dead
                        await new Promise(r => setTimeout(r, 5000)); // Increased from 2000ms
                    } finally {
                        activeFetches.current--;
                        if (isActive && shouldContinue) {
                            // Immediately prompt coordinator to fill the gap
                            checkAndSpawn();
                        }
                    }
                })();
            }
            
            // Backup self-heal in case any loop completely stalled out (e.g. timeout)
            timeoutId = setTimeout(checkAndSpawn, 5000); // Increased from 2000ms
        };

        if (benchmark?.status === "running") {
            checkAndSpawn();
        }

        return () => { 
            isActive = false; 
            clearTimeout(timeoutId);
        };
    }, [benchmark?.id, benchmark?.status, benchmark?.parallelWorkers]);

    const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
    const [collapsedModels, setCollapsedModels] = useState<Record<string, boolean>>({});

    const toggleModelCollapse = (modelName: string) => {
        setCollapsedModels(prev => ({
            ...prev,
            [modelName]: !prev[modelName]
        }));
    };

    const toggleAllModels = () => {
        const allModelNames = [...new Set(benchmark?.entries.map(e => e.model) || [])];
        const allCollapsed = allModelNames.every(name => collapsedModels[name]);
        
        if (allCollapsed) {
            setCollapsedModels({});
            setGlobalSubgroupCollapseSignal({ collapsed: false, timestamp: Date.now() });
        } else {
            const newState: Record<string, boolean> = {};
            allModelNames.forEach(name => { newState[name] = true; });
            setCollapsedModels(newState);
            setGlobalSubgroupCollapseSignal({ collapsed: true, timestamp: Date.now() });
        }
    };

    const [globalSubgroupCollapseSignal, setGlobalSubgroupCollapseSignal] = useState<{ collapsed: boolean; timestamp: number } | null>(null);

    const selectedEntry = React.useMemo(() => {
        if (!benchmark) return null;
        const entry = benchmark.entries.find(e => e.id === selectedEntryId);
        if (!entry) return null;

        // Pre-parse metrics if they exist
        let parsedMetrics = null;
        if (entry.metrics) {
            try {
                parsedMetrics = JSON.parse(entry.metrics);
            } catch (e) {
                console.error("Failed to parse metrics", e);
            }
        }

        return { ...entry, parsedMetrics };
    }, [benchmark, selectedEntryId]);

    if (isLoading) {
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
                        Select or create a run in the &quot;Runs&quot; tab to see details here.
                    </p>
                </div>
            </div>
        );
    }

    const completedCount = benchmark.entries.filter(e => e.status === "completed" || e.status === "failed").length;
    const runningCount = benchmark.entries.filter(e => e.status === "running").length;
    const preparingCount = benchmark.entries.filter(e => e.status === "preparing").length;
    const pendingCount = benchmark.entries.filter(e => e.status === "pending").length;

    const completedProgress = (completedCount / benchmark.totalEntries) * 100;
    const executionProgress = ((runningCount + preparingCount) / benchmark.totalEntries) * 100;
    const pendingProgress = (pendingCount / benchmark.totalEntries) * 100;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="lg:col-span-2 space-y-8">
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
                        <div className="flex items-center gap-4">
                            {benchmark.status === "running" && (
                                <div className="flex items-center gap-2">
                                    {showConfirmCancel ? (
                                        <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                                            <span className="text-[10px] font-bold text-red-500/60 uppercase">Are you sure?</span>
                                            <button
                                                onClick={async () => {
                                                    setIsCancelling(true);
                                                    setShowConfirmCancel(false);
                                                    try {
                                                        await cancelBenchmark(benchmark.id);
                                                        const data = await getBenchmarkProgress(benchmark.id) as (Benchmark & { entries: BenchmarkEntry[] }) | null;
                                                        setBenchmark(data);
                                                        router.refresh();
                                                    } catch (err) {
                                                        console.error("Failed to cancel benchmark", err);
                                                        alert("Failed to cancel benchmark run.");
                                                    } finally {
                                                        setIsCancelling(false);
                                                    }
                                                }}
                                                disabled={isCancelling}
                                                className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-[10px] font-bold uppercase transition-all hover:bg-red-600 disabled:opacity-50"
                                            >
                                                Yes, Cancel
                                            </button>
                                            <button
                                                onClick={() => setShowConfirmCancel(false)}
                                                className="px-3 py-1.5 bg-foreground/5 hover:bg-foreground/10 text-foreground/60 rounded-lg text-[10px] font-bold uppercase transition-all"
                                            >
                                                No
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setShowConfirmCancel(true)}
                                            disabled={isCancelling}
                                            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {isCancelling ? (
                                                <>
                                                    <div className="w-3 h-3 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
                                                    Cancelling...
                                                </>
                                            ) : (
                                                "Cancel Run"
                                            )}
                                        </button>
                                    )}
                                </div>
                            )}
                            <div className="text-right px-6 py-4 glass bg-background/40 rounded-2xl border border-border/50">
                                <span className="text-3xl font-black text-primary font-mono">{Math.round(completedProgress)}%</span>
                                <p className="text-[10px] font-bold uppercase tracking-tighter text-foreground/30">Total Progress</p>
                            </div>
                        </div>
                    </div>

                    <div className="w-full bg-foreground/5 h-4 rounded-full overflow-hidden mb-4 p-1 border border-border/30 flex">
                        {completedProgress > 0 && (
                            <div
                                className={`h-full bg-gradient-to-r from-primary via-primary/80 to-primary/40 transition-all duration-1000 shadow-lg shadow-primary/20 ${completedProgress === 100 ? "rounded-full" : "rounded-l-full"
                                    }`}
                                style={{ width: `${completedProgress}%` }}
                            />
                        )}
                        {executionProgress > 0 && (
                            <div
                                className={`h-full bg-primary/30 animate-pulse transition-all duration-1000 ${completedProgress === 0 && pendingProgress === 0 ? "rounded-full" :
                                    completedProgress === 0 ? "rounded-l-full" :
                                        pendingProgress === 0 ? "rounded-r-full" : ""
                                    }`}
                                style={{ width: `${executionProgress}%` }}
                            />
                        )}
                        {pendingProgress > 0 && (
                            <div
                                className={`h-full bg-foreground/10 transition-all duration-1000 ${completedProgress === 0 && executionProgress === 0 ? "rounded-full" : "rounded-r-full"
                                    }`}
                                style={{ width: `${pendingProgress}%` }}
                            />
                        )}
                    </div>
                    <div className="flex justify-between px-2">
                        <span className="text-xs font-bold text-foreground/30 uppercase tracking-widest flex items-center gap-4">
                            <span>{completedCount} / {benchmark.totalEntries} Evaluated</span>
                            {(runningCount > 0 || preparingCount > 0) && <span className="text-primary animate-pulse">• {runningCount + preparingCount} In Progress</span>}
                            {pendingCount > 0 && <span className="opacity-50">• {pendingCount} Pending</span>}
                        </span>
                    </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/40 flex items-center gap-2">
                        Evaluation Queue
                        <span className="text-[10px] lowercase italic opacity-50 px-2">(Click an entry to view details)</span>
                    </h3>
                    <button
                        onClick={toggleAllModels}
                        className="p-1.5 bg-background/40 hover:bg-background/60 border border-border/50 rounded-lg transition-all text-[10px] font-bold uppercase tracking-widest text-foreground/40 hover:text-primary flex items-center gap-2"
                    >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                        Toggle All
                    </button>
                </div>

                <EvaluationQueue
                    benchmark={benchmark}
                    collapsedModels={collapsedModels}
                    toggleModelCollapse={toggleModelCollapse}
                    selectedEntryId={selectedEntryId}
                    setSelectedEntryId={setSelectedEntryId}
                    modelCapabilities={modelCapabilities}
                    contextGroups={contextGroups}
                    globalCollapseSignal={globalSubgroupCollapseSignal}
                />
            </div>

            {/* Sticky detailed view column */}
            <div className="lg:col-span-1">
                <div className="sticky top-8">
                    {selectedEntry ? (
                        <EntryDetails selectedEntry={selectedEntry} />
                    ) : (
                        <div className="h-full min-h-[400px] flex flex-col items-center justify-center p-12 glass border border-dashed border-border/30 rounded-3xl text-center space-y-4 opacity-50">
                            <span className="text-4xl grayscale">📄</span>
                            <p className="text-sm text-foreground/40">Select an execution from the queue to view its results.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
