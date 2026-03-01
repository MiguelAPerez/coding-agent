"use client";

import React, { useState } from "react";
import { ContextGroupManager } from "./ContextGroupManager";
import { BenchmarkRunner } from "./BenchmarkRunner";
import { BenchmarkProgress } from "./BenchmarkProgress";
import { ContextGroup, Skill, Benchmark } from "@/types/agent";

export const EvaluationLabClient = ({
    initialGroups,
    skills,
    latestBenchmark
}: {
    initialGroups: ContextGroup[];
    skills: Skill[];
    latestBenchmark: Benchmark | null;
}) => {
    const [activeTab, setActiveTab] = useState(latestBenchmark?.status === "running" ? "progress" : "runner");

    const tabs = [
        { id: "runner", label: "Runner", icon: "🚀" },
        { id: "progress", label: "Progress", icon: "📊" },
        { id: "groups", label: "Context Groups", icon: "📁" },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex gap-2 p-1 bg-background/40 glass rounded-2xl border border-border/50 w-fit">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
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
                {activeTab === "runner" && (
                    <BenchmarkRunner contextGroups={initialGroups} />
                )}
                {activeTab === "progress" && (
                    <BenchmarkProgress initialBenchmarkId={latestBenchmark?.id || null} />
                )}
                {activeTab === "groups" && (
                    <ContextGroupManager initialGroups={initialGroups} skills={skills} />
                )}
            </div>
        </div>
    );
};
