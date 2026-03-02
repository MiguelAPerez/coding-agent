"use client";

import React, { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ContextGroupManager } from "./ContextGroupManager";
import { BenchmarkRunManager } from "./BenchmarkRunManager";
import { BenchmarkProgress } from "./Benchmark/BenchmarkProgress";
import { BenchmarkResults } from "./BenchmarkResults";
import { SystemPromptsManager } from "./SystemPromptsManager";
import { SystemPromptSetManager } from "./SystemPromptSetManager";
import { ContextGroup, Skill, Benchmark, BenchmarkRun, BenchmarkEntry, SystemPrompt, SystemPromptSet } from "@/types/agent";
export const EvaluationLabClient = ({
    initialGroups,
    skills,
    latestBenchmark,
    initialRuns,
    completedBenchmarks,
    initialActiveBenchmarks,
    initialSystemPrompts,
    initialSystemPromptSets
}: {
    initialGroups: ContextGroup[];
    skills: Skill[];
    latestBenchmark: Benchmark | null;
    initialRuns: BenchmarkRun[];
    completedBenchmarks: (Benchmark & { entries: BenchmarkEntry[] })[];
    initialActiveBenchmarks: Benchmark[];
    initialSystemPrompts: SystemPrompt[];
    initialSystemPromptSets: SystemPromptSet[];
}) => {
    const searchParams = useSearchParams();
    const router = useRouter();

    const activeTab = searchParams.get("tab") || (latestBenchmark?.status === "running" ? "progress" : "results");
    const [currentBenchmarkId, setCurrentBenchmarkId] = useState<string | null>(latestBenchmark?.id || null);

    const handleTabChange = (tabId: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", tabId);
        router.push(`?${params.toString()}`, { scroll: false });
    };

    const tabs = [
        { id: "results", label: "Results", icon: "🏆" },
        { id: "runs", label: "Runs", icon: "🚀" },
        { id: "progress", label: "Progress", icon: "📊" },
        { id: "system-prompts", label: "Personas", icon: "👤" },
        { id: "prompt-sets", label: "Sets", icon: "📑" },
        { id: "groups", label: "Groups", icon: "📁" },
    ];

    const handleBenchmarkStarted = (id: string) => {
        setCurrentBenchmarkId(id);
        handleTabChange("progress");
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex gap-2 p-1 bg-background/40 glass rounded-2xl border border-border/50 w-fit">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${activeTab === tab.id
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                            : "text-foreground/40 hover:text-foreground/60 hover:bg-foreground/5"
                            }`}
                    >
                        <span>{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="min-h-[600px]">
                {activeTab === "runs" && (
                    <BenchmarkRunManager
                        initialRuns={initialRuns}
                        contextGroups={initialGroups}
                        systemPrompts={initialSystemPrompts}
                        systemPromptSets={initialSystemPromptSets}
                        onBenchmarkStarted={handleBenchmarkStarted}
                        initialActiveBenchmarks={initialActiveBenchmarks}
                    />
                )}
                {activeTab === "progress" && (
                    <BenchmarkProgress initialBenchmarkId={currentBenchmarkId} />
                )}
                {activeTab === "groups" && (
                    <ContextGroupManager initialGroups={initialGroups} skills={skills} />
                )}
                {activeTab === "system-prompts" && (
                    <SystemPromptsManager initialPrompts={initialSystemPrompts} />
                )}
                {activeTab === "prompt-sets" && (
                    <SystemPromptSetManager initialSets={initialSystemPromptSets} prompts={initialSystemPrompts} />
                )}
                {activeTab === "results" && (
                    <BenchmarkResults data={completedBenchmarks} />
                )}
            </div>
        </div>
    );
};
