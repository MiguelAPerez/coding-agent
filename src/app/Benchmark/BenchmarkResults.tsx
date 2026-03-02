"use client";

import React, { useState, useEffect } from "react";
import { Benchmark, BenchmarkEntry } from "@/types/agent";
import { getOllamaModels } from "@/app/actions/ollama";
import { useBenchmarkStats, ViewType } from "./hooks/useBenchmarkStats";
import { ViewSwitcher } from "./components/ViewSwitcher";
import { Leaderboard } from "./components/Leaderboard";
import { Drilldown } from "./components/Drilldown";

export const BenchmarkResults = ({
    data
}: {
    data: (Benchmark & { entries: BenchmarkEntry[] })[];
}) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [modelCapabilities, setModelCapabilities] = useState<Record<string, string[]>>({});
    const [currentView, setCurrentView] = useState<ViewType>("models");
    const [isResetting, setIsResetting] = useState(false);

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

    const processedData = useBenchmarkStats(data, currentView);

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
            <ViewSwitcher
                currentView={currentView}
                onViewChange={(view) => {
                    setCurrentView(view);
                    setSelectedId(null);
                }}
                isResetting={isResetting}
                setIsResetting={setIsResetting}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Leaderboard
                    currentView={currentView}
                    processedData={processedData}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    modelCapabilities={modelCapabilities}
                    runCount={data.length}
                />
                <Drilldown
                    selectedId={selectedId}
                    processedData={processedData}
                />
            </div>
        </div>
    );
};
