"use client";

import React, { useState, useMemo } from "react";
import { Benchmark, BenchmarkEntry } from "@/types/agent";
import { getOllamaModels } from "@/app/actions/ollama";
import { clearBenchmarkData } from "@/app/actions/agent";

type ViewType = "models" | "categories" | "variations";

export const BenchmarkResults = ({
    data
}: {
    data: (Benchmark & { entries: BenchmarkEntry[] })[];
}) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [modelCapabilities, setModelCapabilities] = useState<Record<string, string[]>>({});
    const [currentView, setCurrentView] = useState<ViewType>("models");
    const [isResetting, setIsResetting] = useState(false);

    React.useEffect(() => {
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

    const processedData = useMemo(() => {
        const stats: Record<string, {
            id: string;
            label: string;
            subLabel?: string;
            totalScore: number;
            totalDuration: number;
            totalResponseSize: number;
            totalExpMet: number;
            totalExpChecked: number;
            entryCount: number;
            runs: Set<string>;
            details: Record<string, {
                label: string;
                totalScore: number;
                entryCount: number;
                totalExpMet: number;
                totalExpChecked: number;
            }>;
        }> = {};

        data.forEach(benchmark => {
            benchmark.entries.forEach(entry => {
                if (entry.status !== "completed" || entry.score === null) return;

                let variationName = null;
                try {
                    const m = JSON.parse(entry.metrics || "{}");
                    variationName = m.variationName || null;
                } catch { }

                let key = "";
                let label = "";
                let subLabel = "";

                if (currentView === "models") {
                    key = entry.model;
                    label = entry.model;
                    subLabel = `${entry.model} evaluations`;
                } else if (currentView === "categories") {
                    key = entry.category || "Uncategorized";
                    label = key;
                    subLabel = `Category performance`;
                } else if (currentView === "variations") {
                    key = variationName ? `${entry.model} (${variationName})` : entry.model;
                    label = entry.model;
                    subLabel = variationName || "Default Prompt";
                }

                if (!stats[key]) {
                    stats[key] = {
                        id: key,
                        label,
                        subLabel,
                        totalScore: 0,
                        totalDuration: 0,
                        totalResponseSize: 0,
                        totalExpMet: 0,
                        totalExpChecked: 0,
                        entryCount: 0,
                        runs: new Set(),
                        details: {}
                    };
                }

                stats[key].runs.add(benchmark.name);
                stats[key].totalScore += entry.score;
                if (entry.duration) stats[key].totalDuration += entry.duration;

                try {
                    if (entry.metrics) {
                        const parsedMetrics = JSON.parse(entry.metrics);
                        if (parsedMetrics.responseSize) {
                            stats[key].totalResponseSize += parsedMetrics.responseSize;
                        }
                        if (parsedMetrics.expectationResults) {
                            const met = parsedMetrics.expectationResults.filter((r: { found: boolean }) => r.found).length;
                            stats[key].totalExpMet += met;
                            stats[key].totalExpChecked += parsedMetrics.expectationResults.length;
                        }
                    }
                } catch { }
                stats[key].entryCount++;

                // Details breakdown (by category for models/variations, by model for categories)
                const detailKey = currentView === "categories" ? entry.model : (entry.category || "Uncategorized");
                if (!stats[key].details[detailKey]) {
                    stats[key].details[detailKey] = {
                        label: detailKey,
                        totalScore: 0,
                        entryCount: 0,
                        totalExpMet: 0,
                        totalExpChecked: 0
                    };
                }

                try {
                    if (entry.metrics) {
                        const parsedMetrics = JSON.parse(entry.metrics);
                        if (parsedMetrics.expectationResults) {
                            const met = parsedMetrics.expectationResults.filter((r: { found: boolean }) => r.found).length;
                            stats[key].details[detailKey].totalExpMet += met;
                            stats[key].details[detailKey].totalExpChecked += parsedMetrics.expectationResults.length;
                        }
                    }
                } catch { }

                stats[key].details[detailKey].totalScore += entry.score;
                stats[key].details[detailKey].entryCount++;
            });
        });

        return Object.values(stats).map(s => ({
            ...s,
            avgScore: Math.round(s.totalScore / s.entryCount),
            avgDuration: Math.round(s.totalDuration / s.entryCount),
            avgResponseSize: Math.round(s.totalResponseSize / s.entryCount),
            runs: Array.from(s.runs),
            details: Object.values(s.details).map(d => ({
                ...d,
                avgScore: Math.round(d.totalScore / d.entryCount)
            })).sort((a, b) => b.avgScore - a.avgScore)
        })).sort((a, b) => b.avgScore - a.avgScore);
    }, [data, currentView]);

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

    if (!data.length || processedData.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-12 glass border-2 border-dashed border-border/30 rounded-3xl text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-foreground/5 flex items-center justify-center">
                    <span className="text-3xl grayscale">🏆</span>
                </div>
                <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-foreground/60">No Results Yet</h3>
                    <p className="text-sm text-foreground/40 max-w-xs mx-auto">
                        Complete at least one benchmark run to see aggregated performance data here.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header & View Switcher */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex gap-2 p-1 bg-foreground/5 rounded-xl border border-border/50 w-fit">
                    {(["models", "categories", "variations"] as ViewType[]).map(view => (
                        <button
                            key={view}
                            onClick={() => {
                                setCurrentView(view);
                                setSelectedId(null);
                            }}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${currentView === view
                                ? "bg-background text-foreground shadow-sm border border-border/50"
                                : "text-foreground/40 hover:text-foreground/60 hover:bg-foreground/5"
                                }`}
                        >
                            {view}
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Main Leaderboard */}
                <div className="space-y-6">
                    <div className="space-y-1">
                        <h2 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                            {currentView === "models" ? "Model Leaderboard" :
                                currentView === "categories" ? "Category Performance" : "Variation Leaderboard"}
                        </h2>
                        <p className="text-sm text-foreground/40">Aggregated from {data.length} completed run(s).</p>
                    </div>

                    <div className="space-y-3">
                        {processedData.map((stat, idx) => (
                            <div
                                key={stat.id}
                                onClick={() => setSelectedId(selectedId === stat.id ? null : stat.id)}
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
                                        {currentView !== "categories" && (modelCapabilities[stat.label]?.includes("tools") || modelCapabilities[stat.label]?.includes("thinking")) && (
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

                {/* Drilldown View */}
                <div className="space-y-6">
                    <div className="space-y-1">
                        <h2 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent opacity-0 select-none">
                            Spacer
                        </h2>
                        <p className="text-sm text-foreground/40 opacity-0 select-none">Spacer text.</p>
                    </div>

                    {selectedId ? (
                        <div className="glass p-6 rounded-3xl border border-primary/20 bg-primary/5 animate-in slide-in-from-right-8 duration-500">
                            <div className="mb-8 space-y-2">
                                <h3 className="text-xl font-bold font-mono text-primary flex items-center gap-2">
                                    <span className="text-2xl">🔍</span> {selectedId}
                                </h3>
                                <p className="text-sm text-foreground/60">
                                    {currentView === "categories" ? "Model Performance Breakdown" : "Category Performance Breakdown"}
                                </p>
                            </div>

                            <div className="space-y-6">
                                {processedData.find(s => s.id === selectedId)?.details.map(detail => (
                                    <div key={detail.label} className="space-y-2 group">
                                        <div className="flex justify-between items-end">
                                            <div className="min-w-0 flex-1">
                                                <span className="text-sm font-bold uppercase tracking-wider truncate block">{detail.label}</span>
                                                <span className="text-[10px] text-foreground/40">({detail.entryCount} tests)</span>
                                                {detail.totalExpChecked > 0 && (
                                                    <span className="text-[10px] text-emerald-500/60 font-bold ml-2">
                                                        [{detail.totalExpMet}/{detail.totalExpChecked} exp]
                                                    </span>
                                                )}
                                            </div>
                                            <span className="font-mono font-bold text-sm group-hover:text-primary transition-colors ml-4">{detail.avgScore}%</span>
                                        </div>
                                        <div className="w-full bg-foreground/5 h-2.5 rounded-full overflow-hidden border border-border/30">
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ${detail.avgScore >= 90 ? "bg-emerald-500 shadow-lg shadow-emerald-500/20" :
                                                    detail.avgScore >= 70 ? "bg-primary shadow-lg shadow-primary/20" :
                                                        "bg-amber-500 shadow-lg shadow-amber-500/20"
                                                    }`}
                                                style={{ width: `${detail.avgScore}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full min-h-[400px] flex flex-col items-center justify-center p-12 glass border border-dashed border-border/30 rounded-3xl text-center space-y-4 opacity-50">
                            <span className="text-4xl grayscale">🔍</span>
                            <p className="text-sm text-foreground/40">Select an item from the leaderboard to view its detailed breakdown.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

