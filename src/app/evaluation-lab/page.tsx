import React from "react";
import { getSkills } from "@/app/actions/skills";
import { getSystemPrompts, getSystemPromptSets } from "@/app/actions/prompts";
import { getContextGroups, getLatestBenchmark, getBenchmarkRuns, getCompletedBenchmarks, getActiveBenchmarks } from "@/app/actions/benchmarks";
import { getCachedRepositories } from "@/app/actions/repositories";
import { EvaluationLabClient } from "@/components/EvaluationLab/EvaluationLabClient";
import { ContextGroup, Skill, Benchmark, BenchmarkRun, BenchmarkEntry, SystemPrompt, SystemPromptSet } from "@/types/agent";
import { loadRepoData } from "@/lib/mockDataLoader";

export default async function EvaluationLabPage({
    searchParams
}: {
    searchParams: Promise<{ repo?: string }>
}) {
    const params = await searchParams;
    const repoPath = params.repo;

    let contextGroups = await getContextGroups();
    let systemPrompts = await getSystemPrompts();
    let systemPromptSets = await getSystemPromptSets();

    if (repoPath) {
        try {
            const repoData = await loadRepoData(repoPath);
            contextGroups = repoData.contextGroups as unknown as typeof contextGroups;
            systemPrompts = repoData.systemPrompts as unknown as typeof systemPrompts;
            systemPromptSets = repoData.systemPromptSets as unknown as typeof systemPromptSets;
        } catch (error) {
            console.error("Failed to load repo data:", error);
        }
    }

    const skills = await getSkills();
    const latestBenchmark = await getLatestBenchmark();
    const benchmarkRuns = await getBenchmarkRuns();
    const completedBenchmarks = await getCompletedBenchmarks();
    const activeBenchmarks = await getActiveBenchmarks();
    const repositories = await getCachedRepositories();

    return (
        <div className="container mx-auto px-6 py-12 space-y-12 min-h-screen">
            <div className="space-y-4 animate-in fade-in slide-in-from-top-6 duration-1000">
                <h1 className="text-5xl font-black bg-gradient-to-br from-foreground via-foreground/80 to-primary bg-clip-text text-transparent tracking-tighter">
                    Evaluation Lab
                </h1>
                <p className="text-lg text-foreground/40 max-w-2xl">
                    Benchmark multiple models across different skill sets and prompt templates to find the perfect configuration.
                </p>
            </div>

            <EvaluationLabClient
                initialGroups={contextGroups as ContextGroup[]}
                skills={skills as Skill[]}
                latestBenchmark={latestBenchmark as Benchmark | null}
                initialRuns={benchmarkRuns as BenchmarkRun[]}
                completedBenchmarks={completedBenchmarks as (Benchmark & { entries: BenchmarkEntry[] })[]}
                initialActiveBenchmarks={activeBenchmarks as Benchmark[]}
                initialSystemPrompts={systemPrompts as SystemPrompt[]}
                initialSystemPromptSets={systemPromptSets as SystemPromptSet[]}
                repositories={repositories}
            />
        </div>
    );
}
