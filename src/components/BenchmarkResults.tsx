"use client";

import React, { useState, useMemo } from "react";
import { Benchmark, BenchmarkEntry } from "@/types/agent";

export const BenchmarkResults = ({
    data
}: {
    data: (Benchmark & { entries: BenchmarkEntry[] })[];
}) => {
    const [selectedModel, setSelectedModel] = useState<string | null>(null);

    const aggregatedData = useMemo(() => {
        const modelStats: Record<string, {
            totalScore: number;
            totalDuration: number;
            totalResponseSize: number;
            entryCount: number;
            categories: Record<string, { totalScore: number; entryCount: number }>;
        }> = {};

        data.forEach(benchmark => {
            benchmark.entries.forEach(entry => {
                if (entry.status !== "completed" || entry.score === null) return;

                const model = entry.model;
                if (!modelStats[model]) {
                    modelStats[model] = {
                        totalScore: 0,
                        totalDuration: 0,
                        totalResponseSize: 0,
                        entryCount: 0,
                        categories: {}
                    };
                }

                modelStats[model].totalScore += entry.score;
                if (entry.duration) modelStats[model].totalDuration += entry.duration;
                try {
                    if (entry.metrics) {
                        const parsedMetrics = JSON.parse(entry.metrics);
                        if (parsedMetrics.responseSize) {
                            modelStats[model].totalResponseSize += parsedMetrics.responseSize;
                        }
                    }
                } catch { }
                modelStats[model].entryCount++;

                const category = entry.category || "Uncategorized";
                if (!modelStats[model].categories[category]) {
                    modelStats[model].categories[category] = { totalScore: 0, entryCount: 0 };
                }
                modelStats[model].categories[category].totalScore += entry.score;
                modelStats[model].categories[category].entryCount++;
            });
        });

        const sortedModels = Object.entries(modelStats).map(([model, stats]) => {
            return {
                model,
                avgScore: Math.round(stats.totalScore / stats.entryCount),
                avgDuration: Math.round(stats.totalDuration / stats.entryCount),
                avgResponseSize: Math.round(stats.totalResponseSize / stats.entryCount),
                evaluations: stats.entryCount,
                categories: Object.entries(stats.categories).map(([cat, cStats]) => ({
                    category: cat,
                    avgScore: Math.round(cStats.totalScore / cStats.entryCount),
                    evaluations: cStats.entryCount
                })).sort((a, b) => b.avgScore - a.avgScore)
            };
        }).sort((a, b) => b.avgScore - a.avgScore);

        return sortedModels;
    }, [data]);

    if (!data.length || aggregatedData.length === 0) {
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Main Leaderboard */}
            <div className="space-y-6">
                <div className="space-y-1">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                        Model Leaderboard
                    </h2>
                    <p className="text-sm text-foreground/40">Aggregated from {data.length} completed run(s).</p>
                </div>

                <div className="space-y-3">
                    {aggregatedData.map((stat, idx) => (
                        <div
                            key={stat.model}
                            onClick={() => setSelectedModel(selectedModel === stat.model ? null : stat.model)}
                            className={`glass p-5 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 group ${selectedModel === stat.model
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
                                <h3 className="font-bold text-lg truncate group-hover:text-primary transition-colors">{stat.model}</h3>
                                <p className="text-xs text-foreground/40 font-mono flex flex-wrap items-center gap-2">
                                    <span>{stat.evaluations} evals</span>
                                    <span>•</span>
                                    <span>~{stat.avgDuration}ms latency</span>
                                    {stat.avgResponseSize > 0 && (
                                        <>
                                            <span>•</span>
                                            <span>~{stat.avgResponseSize} chars</span>
                                        </>
                                    )}
                                </p>
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

                {selectedModel ? (
                    <div className="glass p-6 rounded-3xl border border-primary/20 bg-primary/5 animate-in slide-in-from-right-8 duration-500">
                        <div className="mb-8 space-y-2">
                            <h3 className="text-xl font-bold font-mono text-primary flex items-center gap-2">
                                <span className="text-2xl">🔍</span> {selectedModel}
                            </h3>
                            <p className="text-sm text-foreground/60">Category Performance Breakdown</p>
                        </div>

                        <div className="space-y-6">
                            {aggregatedData.find(s => s.model === selectedModel)?.categories.map(cat => (
                                <div key={cat.category} className="space-y-2 group">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <span className="text-sm font-bold uppercase tracking-wider">{cat.category}</span>
                                            <span className="text-[10px] text-foreground/40 ml-2">({cat.evaluations} tests)</span>
                                        </div>
                                        <span className="font-mono font-bold text-sm group-hover:text-primary transition-colors">{cat.avgScore}%</span>
                                    </div>
                                    <div className="w-full bg-foreground/5 h-2.5 rounded-full overflow-hidden border border-border/30">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ${cat.avgScore >= 90 ? "bg-emerald-500 shadow-lg shadow-emerald-500/20" :
                                                cat.avgScore >= 70 ? "bg-primary shadow-lg shadow-primary/20" :
                                                    "bg-amber-500 shadow-lg shadow-amber-500/20"
                                                }`}
                                            style={{ width: `${cat.avgScore}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="h-full min-h-[400px] flex flex-col items-center justify-center p-12 glass border border-dashed border-border/30 rounded-3xl text-center space-y-4 opacity-50">
                        <span className="text-4xl grayscale">🔍</span>
                        <p className="text-sm text-foreground/40">Select a model from the leaderboard to view its category breakdown.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
