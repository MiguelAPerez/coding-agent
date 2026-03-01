import React from "react";
import { Benchmark, BenchmarkEntry } from "@/types/agent";
import { LiveTimer } from "./LiveTimer";

export const EvaluationQueue = ({
    benchmark,
    collapsedModels,
    toggleModelCollapse,
    selectedEntryId,
    setSelectedEntryId,
    modelCapabilities
}: {
    benchmark: Benchmark & { entries: BenchmarkEntry[] };
    collapsedModels: Record<string, boolean>;
    toggleModelCollapse: (modelName: string) => void;
    selectedEntryId: string | null;
    setSelectedEntryId: (id: string | null) => void;
    modelCapabilities: Record<string, string[]>;
}) => {
    return (
        <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/40 flex items-center gap-2">
                Evaluation Queue
                <span className="text-[10px] lowercase italic opacity-50 px-2">(Click an entry to view details)</span>
            </h3>
            <div className="grid grid-cols-1 gap-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
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
                    const isCollapsed = collapsedModels[modelName] !== false;

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
                                        <div
                                            className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-l-full transition-all duration-1000 shadow-lg shadow-primary/20"
                                            style={{ width: `${modelCompletedProgress}%` }}
                                        />
                                        <div
                                            className="h-full bg-primary/20 animate-pulse transition-all duration-1000"
                                            style={{ width: `${modelRunningProgress}%` }}
                                        />
                                        <div
                                            className="h-full bg-foreground/5 transition-all duration-1000 rounded-r-full"
                                            style={{ width: `${modelPendingProgress}%` }}
                                        />
                                    </div>
                                )}
                            </h4>
                            {!isCollapsed && (
                                <div className="grid grid-cols-1 gap-3">
                                    {entries.map((entry, idx) => (
                                        <div
                                            key={entry.id}
                                            onClick={() => (entry.status === "completed" || entry.status === "running" || entry.status === "cancelled") && setSelectedEntryId(entry.id)}
                                            className={`glass p-4 rounded-2xl border transition-all flex items-center justify-between group cursor-pointer ${entry.status === "running"
                                                ? selectedEntryId === entry.id ? "border-primary bg-primary/10 shadow-xl" : "border-primary/50 bg-primary/5 scale-[1.01] shadow-xl"
                                                : entry.status === "completed"
                                                    ? selectedEntryId === entry.id ? "border-primary bg-primary/5" : "border-green-500/20 hover:border-primary/40"
                                                    : entry.status === "cancelled"
                                                        ? selectedEntryId === entry.id ? "border-amber-500/40 bg-amber-500/5 text-amber-600/60" : "border-amber-500/20 hover:border-amber-500/40 text-amber-600/40"
                                                        : "border-border/30 opacity-50 cursor-not-allowed"
                                                }`}
                                        >
                                            <div className="flex items-center gap-5">
                                                <div className="w-8 h-8 rounded-xl bg-foreground/5 flex items-center justify-center font-mono text-xs font-bold text-foreground/30 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                                                    {(idx + 1).toString().padStart(2, '0')}
                                                </div>
                                                <div className="space-y-0.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-foreground/80">{entry.category || "Uncategorized"}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${entry.status === "running" ? "text-primary animate-pulse" :
                                                            entry.status === "completed" ? "text-green-500/60" :
                                                                entry.status === "cancelled" ? "text-amber-500/60" : "text-foreground/20"
                                                            }`}>
                                                            {entry.status}
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
                                                                        return m.keywordMatches?.filter((match: { found: boolean }) => match.found).length || 0;
                                                                    } catch {
                                                                        return 0;
                                                                    }
                                                                })()} matches
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
                                                {entry.status === "completed" && (
                                                    <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center">
                                                        <span className="text-green-500 text-xs">✓</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
