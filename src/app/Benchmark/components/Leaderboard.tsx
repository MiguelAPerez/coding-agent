import React from "react";
import { ViewType, BenchmarkStat } from "../hooks/useBenchmarkStats";

interface LeaderboardProps {
    currentView: ViewType;
    processedData: BenchmarkStat[];
    selectedId: string | null;
    onSelect: (id: string | null) => void;
    modelCapabilities: Record<string, string[]>;
    runCount: number;
}

export const Leaderboard = ({
    currentView,
    processedData,
    selectedId,
    onSelect,
    modelCapabilities,
    runCount
}: LeaderboardProps) => {
    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h2 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                    {currentView === "models" ? "Model Leaderboard" : "Persona Leaderboard"}
                </h2>
                <p className="text-sm text-foreground/40">Aggregated from {runCount} completed run(s).</p>
            </div>

            <div className="space-y-3">
                {processedData.map((stat, idx) => (
                    <div
                        key={stat.id}
                        onClick={() => onSelect(selectedId === stat.id ? null : stat.id)}
                        className={`glass p-5 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 group ${selectedId === stat.id
                            ? "border-primary bg-primary/5 shadow-lg shadow-primary/10 scale-[1.02]"
                            : "border-border/50 hover:border-primary/30 hover:bg-foreground/5"
                            }`}
                    >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${idx === 0 ? "bg-amber-500 text-amber-950 shadow-lg shadow-amber-500/20" :
                            idx === 1 ? "bg-slate-300 text-slate-800" :
                                idx === 2 ? "bg-amber-700/60 text-amber-100" :
                                    "bg-foreground/5 text-foreground/40 font-mono"
                            }`}>
                            {idx === 0 ? '🏆' : idx + 1}
                        </div>

                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-lg truncate group-hover:text-primary transition-colors flex items-center gap-2">
                                {stat.label}
                                {currentView === "models" && (modelCapabilities[stat.label]?.includes("tools") || modelCapabilities[stat.label]?.includes("thinking")) && (
                                    <span className="flex gap-1.5 ml-1" title="Model Capabilities">
                                        {modelCapabilities[stat.label].includes("tools") && <span className="text-[10px] w-6 h-5 flex items-center justify-center rounded bg-blue-500/10 text-blue-500 border border-blue-500/20" title="Supports Tools">🔧</span>}
                                        {modelCapabilities[stat.label].includes("thinking") && <span className="text-[10px] w-6 h-5 flex items-center justify-center rounded bg-purple-500/10 text-purple-600 border border-purple-500/20" title="Has Thinking Phase">🧠</span>}
                                    </span>
                                )}
                            </h3>
                            <div className="flex flex-col">
                                <p className="text-xs text-primary/80 font-bold mb-1 truncate">{stat.subLabel}</p>
                                <p className="text-xs text-foreground/40 font-mono flex flex-wrap items-center gap-2">
                                    <span>{stat.entryCount} evals</span>
                                    <span>•</span>
                                    <span>~{stat.avgDuration}ms latency</span>
                                    {stat.avgResponseSize > 0 && (
                                        <>
                                            <span>•</span>
                                            <span>~{stat.avgResponseSize} chars</span>
                                        </>
                                    )}
                                    {stat.totalExpChecked > 0 && (
                                        <>
                                            <span>•</span>
                                            <span className="text-emerald-500/80 font-bold">{stat.totalExpMet}/{stat.totalExpChecked} expectations</span>
                                        </>
                                    )}
                                </p>
                            </div>
                            {stat.runs.length > 0 && (
                                <p className="text-[10px] text-foreground/30 font-mono truncate mt-1" title={`Runs: ${stat.runs.join(', ')}`}>
                                    runs: {stat.runs.slice(0, 3).join(', ')}{stat.runs.length > 3 ? ` +${stat.runs.length - 3} more` : ''}
                                </p>
                            )}
                        </div>

                        <div className="text-right">
                            <span className={`text-2xl font-black font-mono ${stat.avgScore >= 90 ? "text-emerald-500" :
                                stat.avgScore >= 70 ? "text-primary" :
                                    "text-amber-500"
                                }`}>
                                {stat.avgScore}%
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
