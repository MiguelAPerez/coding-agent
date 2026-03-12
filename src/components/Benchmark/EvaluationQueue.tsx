import React, { useState } from "react";
import { Benchmark, BenchmarkEntry, ContextGroup } from "@/types/agent";
import { LiveTimer } from "./LiveTimer";
import { useRouter } from "next/navigation";

export const EvaluationQueue = ({
    benchmark,
    collapsedModels,
    toggleModelCollapse,
    selectedEntryId,
    setSelectedEntryId,
    modelCapabilities,
    contextGroups,
    globalCollapseSignal
}: {
    benchmark: Benchmark & { entries: BenchmarkEntry[] };
    collapsedModels: Record<string, boolean>;
    toggleModelCollapse: (modelName: string) => void;
    selectedEntryId: string | null;
    setSelectedEntryId: (id: string | null) => void;
    modelCapabilities: Record<string, string[]>;
    contextGroups: ContextGroup[];
    globalCollapseSignal?: { collapsed: boolean; timestamp: number } | null;
}) => {
    const router = useRouter();
    const [collapsedSubgroups, setCollapsedSubgroups] = useState<Record<string, boolean>>({});

    const lastProcessedTimestamp = React.useRef<number>(0);

    // Handle global collapse signal
    React.useEffect(() => {
        if (!globalCollapseSignal || globalCollapseSignal.timestamp <= lastProcessedTimestamp.current) return;
        lastProcessedTimestamp.current = globalCollapseSignal.timestamp;

        if (globalCollapseSignal.collapsed) {
            // Collapse all subgroups
            const newState: Record<string, boolean> = {};
            const categories = new Set(benchmark.entries.map(e => e.category || "Uncategorized"));
            const models = new Set(benchmark.entries.map(e => e.model));

            models.forEach(m => {
                categories.forEach(c => {
                    newState[`${m}:${c}`] = true;
                });
            });
            setCollapsedSubgroups(newState);
        } else {
            // Expand all subgroups
            setCollapsedSubgroups({});
        }
    }, [globalCollapseSignal, benchmark.entries]);

    const toggleSubgroup = (model: string, category: string) => {
        const key = `${model}:${category}`;
        setCollapsedSubgroups(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleJumpToManager = (e: React.MouseEvent, testName: string) => {
        e.stopPropagation();
        router.push(`?tab=groups&search=${encodeURIComponent(testName)}`);
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-6 max-h-[1000px] overflow-y-auto pr-2 custom-scrollbar pb-20">
                {Object.entries(
                    benchmark.entries.reduce((acc, entry) => {
                        if (!acc[entry.model]) acc[entry.model] = [];
                        acc[entry.model].push(entry);
                        return acc;
                    }, {} as Record<string, BenchmarkEntry[]>)
                ).map(([modelName, entries]) => {
                    const modelCompleted = entries.filter(e => e.status === "completed" || e.status === "failed").length;
                    const modelRunning = entries.filter(e => e.status === "running").length;
                    const modelPending = entries.filter(e => e.status === "pending").length;

                    const modelCompletedProgress = entries.length > 0 ? (modelCompleted / entries.length) * 100 : 0;
                    const modelRunningProgress = entries.length > 0 ? (modelRunning / entries.length) * 100 : 0;
                    const modelPendingProgress = entries.length > 0 ? (modelPending / entries.length) * 100 : 0;
                    const isCollapsed = collapsedModels[modelName] === true;

                    const entriesByCategory = entries.reduce((acc, entry) => {
                        const cat = entry.category || "Uncategorized";
                        if (!acc[cat]) acc[cat] = [];
                        acc[cat].push(entry);
                        return acc;
                    }, {} as Record<string, BenchmarkEntry[]>);

                    const sortedCategories = Object.entries(entriesByCategory).sort(([a], [b]) => a.localeCompare(b));

                    return (
                        <div key={modelName} className="space-y-3 relative">
                            <h4
                                onClick={() => toggleModelCollapse(modelName)}
                                className="text-xs font-bold font-mono tracking-widest text-foreground/60 sticky top-0 bg-background/90 backdrop-blur-xl py-2 z-10 border-b border-border/10 flex items-center justify-between gap-2 rounded-t-lg cursor-pointer hover:text-primary transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-primary w-4">{isCollapsed ? "▶" : "▼"}</span>
                                    <span className="text-primary">⚡</span> {modelName}
                                    {(modelCapabilities[modelName]?.includes("tools") || modelCapabilities[modelName]?.includes("thinking")) && (
                                        <span className="flex gap-1.5 ml-1" title="Model Capabilities">
                                            {modelCapabilities[modelName].includes("tools") && <span className="text-[9px] px-1 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20 leading-none" title="Supports Tools">🔧</span>}
                                            {modelCapabilities[modelName].includes("thinking") && <span className="text-[9px] px-1 py-0.5 rounded bg-purple-500/10 text-purple-600 border border-purple-500/20 leading-none" title="Has Thinking Phase">🧠</span>}
                                        </span>
                                    )}
                                    <span className="text-[10px] opacity-60 normal-case">({modelCompleted}/{entries.length})</span>
                                </div>
                                {isCollapsed && (
                                    <div className="w-24 bg-foreground/5 h-2 rounded-full overflow-hidden border border-border/30 flex">
                                        {modelCompletedProgress > 0 && (
                                            <div
                                                className={`h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-1000 shadow-lg shadow-primary/20 ${modelCompletedProgress === 100 ? "rounded-full" : "rounded-l-full"
                                                    }`}
                                                style={{ width: `${modelCompletedProgress}%` }}
                                            />
                                        )}
                                        {modelRunningProgress > 0 && (
                                            <div
                                                className={`h-full bg-primary/30 animate-pulse transition-all duration-1000 ${modelCompletedProgress === 0 && modelPendingProgress === 0 ? "rounded-full" :
                                                    modelCompletedProgress === 0 ? "rounded-l-full" :
                                                        modelPendingProgress === 0 ? "rounded-r-full" : ""
                                                    }`}
                                                style={{ width: `${modelRunningProgress}%` }}
                                            />
                                        )}
                                        {modelPendingProgress > 0 && (
                                            <div
                                                className={`h-full bg-foreground/10 transition-all duration-1000 ${modelCompletedProgress === 0 && modelRunningProgress === 0 ? "rounded-full" : "rounded-r-full"
                                                    }`}
                                                style={{ width: `${modelPendingProgress}%` }}
                                            />
                                        )}
                                    </div>
                                )}
                            </h4>
                            {!isCollapsed && (
                                <div className="pl-4 space-y-6">
                                    {sortedCategories.map(([category, catEntries]) => {
                                        const subKey = `${modelName}:${category}`;
                                        const isSubCollapsed = collapsedSubgroups[subKey];

                                        const catCompleted = catEntries.filter(e => e.status === "completed").length;
                                        const catRunning = catEntries.filter(e => e.status === "running").length;
                                        const catTotal = catEntries.length;
                                        const catProgress = catTotal > 0 ? (catCompleted / catTotal) * 100 : 0;
                                        const isCatRunning = catRunning > 0;
                                        const isCatDone = catCompleted === catTotal && catTotal > 0;

                                        return (
                                            <div key={category} className="space-y-3">
                                                <button
                                                    onClick={() => toggleSubgroup(modelName, category)}
                                                    className="flex items-center gap-2 group/sub w-full"
                                                >
                                                    <span className={`text-[8px] transition-transform duration-200 ${isSubCollapsed ? "-rotate-90" : ""}`}>▼</span>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40 group-hover/sub:text-foreground/60 transition-colors flex items-center gap-2">
                                                        {category}
                                                        {isCatRunning && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                                                        {isCatDone && <span className="text-[10px] text-green-500">✓</span>}
                                                    </span>
                                                    <div className="flex-1 h-[1px] bg-border/20 mx-2" />
                                                    
                                                    {isSubCollapsed && !isCatDone && (
                                                        <div className="w-12 h-1 bg-foreground/5 rounded-full overflow-hidden mr-2">
                                                            <div 
                                                                className="h-full bg-primary/40 transition-all duration-500" 
                                                                style={{ width: `${catProgress}%` }}
                                                            />
                                                        </div>
                                                    )}
                                                    
                                                    <span className="text-[9px] font-bold text-foreground/20">
                                                        {catCompleted}/{catTotal}
                                                    </span>
                                                </button>

                                                {!isSubCollapsed && (
                                                    <div className="grid grid-cols-1 gap-3">
                                                        {catEntries.map((entry, idx) => {
                                                            const group = contextGroups.find(g => g.id === entry.contextGroupId);
                                                            const testName = group?.name || "Unknown test";
                                                            return (
                                                                <div
                                                                    key={entry.id}
                                                                    onClick={() => (entry.status === "completed" || entry.status === "running" || entry.status === "preparing" || entry.status === "cancelled") && setSelectedEntryId(entry.id)}
                                                                    className={`glass p-4 rounded-2xl border transition-all flex items-center justify-between group cursor-pointer ${entry.status === "running"
                                                                        ? selectedEntryId === entry.id ? "border-primary bg-primary/10 shadow-xl" : "border-primary/50 bg-primary/5 scale-[1.01] shadow-xl"
                                                                        : entry.status === "preparing"
                                                                            ? selectedEntryId === entry.id ? "border-purple-500 bg-purple-500/10 shadow-lg" : "border-purple-500/50 bg-purple-500/5 scale-[1.005] shadow-lg"
                                                                            : entry.status === "completed"
                                                                                ? selectedEntryId === entry.id ? "border-primary bg-primary/5" : "border-green-500/20 hover:border-primary/40"
                                                                                : entry.status === "cancelled"
                                                                                    ? selectedEntryId === entry.id ? "border-amber-500/40 bg-amber-500/5 text-amber-600/60" : "border-amber-500/20 hover:border-amber-500/40 text-amber-600/40"
                                                                                    : "border-border/30 opacity-60 cursor-default hover:bg-foreground/5 hover:border-border/50 hover:opacity-100"
                                                                        }`}
                                                                >
                                                                    <div className="flex items-center gap-5">
                                                                        <div className="w-8 h-8 rounded-xl bg-foreground/5 flex items-center justify-center font-mono text-xs font-bold text-foreground/30 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                                                                            {(idx + 1).toString().padStart(2, '0')}
                                                                        </div>
                                                                        <div className="space-y-0.5">
                                                                            <div className="flex items-center gap-2">
                                                                                <button
                                                                                    onClick={(e) => handleJumpToManager(e, testName)}
                                                                                    className="font-bold text-foreground/80 hover:text-primary transition-colors flex items-center gap-2 group/jump"
                                                                                >
                                                                                    {testName}
                                                                                    <span className="opacity-0 group-hover/jump:opacity-100 transition-opacity text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase font-black">Jump to manager</span>
                                                                                </button>
                                                                                {(() => {
                                                                                    try {
                                                                                        const m = JSON.parse(entry.metrics || "{}");
                                                                                        if (m.variationName) {
                                                                                            return (
                                                                                                <span className="text-[10px] bg-purple-500/10 text-purple-500 px-2 py-0.5 rounded-md font-black uppercase tracking-tighter">
                                                                                                    {m.variationName}
                                                                                                </span>
                                                                                            );
                                                                                        }
                                                                                        const pm = JSON.parse(entry.metrics || "{}");
                                                                                        if (pm.pendingVariation) {
                                                                                            return (
                                                                                                <span className="text-[10px] bg-purple-500/10 text-purple-500 px-2 py-0.5 rounded-md font-black uppercase tracking-tighter">
                                                                                                    {pm.pendingVariation.name}
                                                                                                </span>
                                                                                            );
                                                                                        }
                                                                                    } catch { }
                                                                                    return null;
                                                                                })()}
                                                                            </div>
                                                                            <div className="flex items-center gap-2">
                                                                                <span className={`text-[10px] font-bold uppercase tracking-widest ${entry.status === "running" ? "text-primary animate-pulse" :
                                                                                    entry.status === "preparing" ? "text-purple-500 animate-pulse" :
                                                                                        entry.status === "completed" ? "text-green-500/60" :
                                                                                            entry.status === "cancelled" ? "text-amber-500/60" : "text-foreground/40"
                                                                                    }`}>
                                                                                    {entry.status === "pending" ? "Queued" : entry.status === "preparing" ? "Prep Work" : entry.status}
                                                                                </span>
                                                                                {entry.status === "completed" && entry.score !== null && (
                                                                                    <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded font-black">
                                                                                        {entry.score}%
                                                                                    </span>
                                                                                )}
                                                                                {entry.status === "completed" && entry.metrics && (
                                                                                    <span className="text-[10px] text-foreground/20 italic">
                                                                                        {(() => {
                                                                                            try {
                                                                                                const m = JSON.parse(entry.metrics);
                                                                                                if (m.expectationResults) {
                                                                                                    const results = m.expectationResults || [];
                                                                                                    return `${results.filter((res: { found: boolean }) => res.found).length} / ${results.length}`;
                                                                                                }
                                                                                                return "0/0";
                                                                                            } catch {
                                                                                                return "0/0";
                                                                                            }
                                                                                        })()} met
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center gap-4">
                                                                        {entry.duration && entry.status === "completed" && (
                                                                            <span className="text-[10px] text-foreground/20 font-mono">
                                                                                {entry.duration}ms
                                                                            </span>
                                                                        )}
                                                                        {entry.status === "running" && entry.startedAt && (
                                                                            <span className="text-[10px] text-primary/70 font-mono flex items-center gap-2">
                                                                                <LiveTimer startedAt={entry.startedAt} />
                                                                            </span>
                                                                        )}
                                                                        {entry.status === "running" && (
                                                                            <div className="flex items-center gap-1">
                                                                                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                                                                                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                                                                                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                                                                            </div>
                                                                        )}
                                                                        {entry.status === "preparing" && (
                                                                            <div className="flex items-center gap-1.5 px-2 py-1 bg-purple-500/10 rounded-lg">
                                                                                <div className="w-3 h-3 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                                                                                <span className="text-[9px] font-bold text-purple-500 uppercase tracking-widest hidden sm:inline-block">Loading Context</span>
                                                                            </div>
                                                                        )}
                                                                        {entry.status === "completed" && (
                                                                            <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center">
                                                                                <span className="text-green-500 text-xs">✓</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
