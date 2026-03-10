"use client";

import React, { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ContextGroupManager } from "./ContextGroupManager";
import { BenchmarkRunManager } from "../Benchmark/BenchmarkRunManager";
import { BenchmarkProgress } from "../Benchmark/BenchmarkProgress";
import { BenchmarkResults } from "@/app/Benchmark/BenchmarkResults";
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
    initialSystemPromptSets,
    repositories
}: {
    initialGroups: ContextGroup[];
    skills: Skill[];
    latestBenchmark: Benchmark | null;
    initialRuns: BenchmarkRun[];
    completedBenchmarks: (Benchmark & { entries: BenchmarkEntry[] })[];
    initialActiveBenchmarks: Benchmark[];
    initialSystemPrompts: SystemPrompt[];
    initialSystemPromptSets: SystemPromptSet[];
    repositories: { id: string, fullName: string, enabled: boolean }[];
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
        { id: "repo", label: "Repositories", icon: "📦" },
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
                    <ContextGroupManager
                        initialGroups={initialGroups}
                        skills={skills}
                        prompts={initialSystemPrompts}
                        promptSets={initialSystemPromptSets}
                    />
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
                {activeTab === "repo" && (
                    <div className="p-6 bg-card rounded-2xl border border-border shadow-sm max-w-2xl text-card-foreground">
                        <h2 className="text-xl font-semibold mb-4">Mock Repository Data</h2>
                        <p className="text-sm text-foreground/60 mb-6">
                            Optionally load evaluation contexts and system prompts from a local mock repository instead of the database.
                        </p>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                const repo = formData.get("repo") as string;
                                const params = new URLSearchParams(searchParams.toString());
                                if (repo) {
                                    params.set("repo", repo);
                                } else {
                                    params.delete("repo");
                                }
                                router.push(`?${params.toString()}`, { scroll: false });
                            }}
                            className="flex flex-col gap-4"
                        >
                            <div className="flex gap-4 items-end">
                                <label className="flex-1 space-y-2">
                                    <span className="text-sm font-medium">Repository Path (e.g. mperez/devtools)</span>
                                    <select
                                        name="repo"
                                        defaultValue={searchParams.get("repo") || ""}
                                        className="w-full h-10 px-3 rounded-lg border border-border bg-background cursor-pointer"
                                    >
                                        <option value="" disabled>Select a repository</option>
                                        {repositories.filter(repo => repo.enabled).map(repo => (
                                            <option key={repo.id} value={repo.fullName}>
                                                {repo.fullName}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <button
                                    type="submit"
                                    className="h-10 px-6 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90"
                                >
                                    Apply
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const params = new URLSearchParams(searchParams.toString());
                                        params.delete("repo");
                                        router.push(`?${params.toString()}`, { scroll: false });
                                    }}
                                    className="h-10 px-6 rounded-lg border border-border font-medium hover:bg-muted"
                                >
                                    Clear
                                </button>
                            </div>
                            
                            {searchParams.get("repo") && (
                                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-3">
                                    <span className="text-lg">✅</span>
                                    <div>
                                        <p className="font-semibold">Mock Repository Active</p>
                                        <p className="opacity-80">Currently loading evaluation data from {searchParams.get("repo")}. Check the other tabs to verify.</p>
                                    </div>
                                </div>
                            )}
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};
