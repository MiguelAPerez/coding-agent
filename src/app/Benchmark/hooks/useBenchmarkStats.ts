"use client";

import { useMemo } from "react";
import { Benchmark, BenchmarkEntry } from "@/types/agent";

export type ViewType = "models" | "variations";

export type BenchmarkStat = {
    id: string;
    label: string;
    subLabel?: string;
    totalScore: number;
    totalDuration: number;
    totalResponseSize: number;
    totalExpMet: number;
    totalExpChecked: number;
    entryCount: number;
    runs: string[];
    avgScore: number;
    avgDuration: number;
    avgResponseSize: number;
    details: {
        label: string;
        totalScore: number;
        entryCount: number;
        totalExpMet: number;
        totalExpChecked: number;
        avgScore: number;
    }[];
};

export function useBenchmarkStats(data: (Benchmark & { entries: BenchmarkEntry[] })[], currentView: ViewType): BenchmarkStat[] {
    return useMemo(() => {
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
                } else if (currentView === "variations") {
                    key = variationName || "Default Prompt";
                    label = key;
                    subLabel = entry.model;
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

                // Details breakdown (by category for models and variations)
                let detailKey = "";
                if (currentView === "models") {
                    detailKey = entry.category || "Uncategorized";
                } else if (currentView === "variations") {
                    detailKey = entry.category || "Uncategorized";
                }
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

        return Object.values(stats).map(s => {
            const sortedDetails = Object.values(s.details).map(d => ({
                ...d,
                avgScore: Math.round(d.totalScore / d.entryCount)
            })).sort((a, b) => b.avgScore - a.avgScore);

            let subLabel = s.subLabel;
            if (currentView === "variations" && sortedDetails.length > 0) {
                subLabel = `Winner: ${sortedDetails[0].label}`;
            }

            return {
                ...s,
                subLabel,
                avgScore: Math.round(s.totalScore / s.entryCount),
                avgDuration: Math.round(s.totalDuration / s.entryCount),
                avgResponseSize: Math.round(s.totalResponseSize / s.entryCount),
                runs: Array.from(s.runs),
                details: sortedDetails
            };
        }).sort((a, b) => b.avgScore - a.avgScore);
    }, [data, currentView]);
}
