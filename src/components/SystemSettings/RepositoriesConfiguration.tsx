"use client";

import React, { useEffect, useState } from "react";
import { getCachedRepositories, setConfigRepository } from "@/app/actions/repositories";
import { RepositoryIcon, ChevronDownIcon } from "@/components/icons";

interface Repository {
    id: string;
    fullName: string;
    enabled: boolean;
    isConfigRepository?: boolean;
}

export default function RepositoriesConfiguration({ initialRepos = [] }: { initialRepos?: Repository[] }) {
    const [repositories, setRepositories] = useState<Repository[]>(initialRepos);
    const [loading, setLoading] = useState(initialRepos.length === 0);
    const [updating, setUpdating] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [filterText, setFilterText] = useState("");

    useEffect(() => {
        if (initialRepos.length === 0) {
            fetchRepositories();
        }
    }, [initialRepos.length]);

    const fetchRepositories = async () => {
        setLoading(true);
        try {
            const repos = await getCachedRepositories();
            setRepositories(repos);
        } catch (error) {
            console.error("Failed to load repositories:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSetConfigRepository = async (repoId: string | null) => {
        setUpdating(repoId || "clear");
        try {
            await setConfigRepository(repoId);
            setRepositories(repositories.map(repo => ({
                ...repo,
                isConfigRepository: repo.id === repoId
            })));
        } catch (error) {
            console.error("Failed to set config repository:", error);
        } finally {
            setUpdating(null);
        }
    };

    const enabledRepos = repositories.filter(r => r.enabled);
    const activeRepo = repositories.find(r => r.isConfigRepository);
    const filteredRepos = enabledRepos.filter(repo =>
        repo.fullName.toLowerCase().includes(filterText.toLowerCase())
    );

    return (
        <div className="p-6 rounded-xl bg-foreground/5 border border-border">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <RepositoryIcon className="w-5 h-5 text-primary" />
                    Global Configuration Repository
                </h2>
                {activeRepo && (
                    <div className="text-sm font-medium px-3 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20">
                        Active: {activeRepo.fullName}
                    </div>
                )}
            </div>
            <p className="text-sm text-foreground/60 mb-6 max-w-2xl">
                Select a primary repository to load configuration data from across different application features.
                Each feature will look for a feature-specific directory inside this repository (e.g., <code className="px-1 py-0.5 rounded bg-foreground/10 text-xs">/eval-lab</code> for the Evaluation Lab).
            </p>

            <div className="border border-border rounded-xl bg-background overflow-hidden">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                    <span className="font-medium text-sm">
                        {isExpanded ? "Hide Repositories" : "Choose Repository"}
                    </span>
                    <ChevronDownIcon
                        className={`w-5 h-5 text-foreground/40 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                    />
                </button>

                {isExpanded && (
                    <div className="p-4 border-t border-border bg-foreground/[0.02] space-y-4">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Filter repositories..."
                                value={filterText}
                                onChange={(e) => setFilterText(e.target.value)}
                                className="w-full h-10 pl-4 pr-10 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                            {filterText && (
                                <button
                                    onClick={() => setFilterText("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground/80"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {loading ? (
                            <div className="animate-pulse flex space-x-4">
                                <div className="flex-1 space-y-4 py-1">
                                    <div className="h-4 bg-foreground/10 rounded w-3/4"></div>
                                    <div className="h-4 bg-foreground/10 rounded w-1/2"></div>
                                </div>
                            </div>
                        ) : enabledRepos.length === 0 ? (
                            <div className="p-4 bg-destructive/10 text-destructive text-sm rounded-lg border border-destructive/20">
                                No enabled repositories found. Please configure a Git provider and enable a repository first.
                            </div>
                        ) : filteredRepos.length === 0 ? (
                            <div className="p-8 text-center text-foreground/40 text-sm border border-dashed border-border rounded-xl">
                                No repositories match your filter.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {filteredRepos.map(repo => (
                                    <div
                                        key={repo.id}
                                        className={`flex items-center justify-between p-4 rounded-xl border transition-all ${repo.isConfigRepository
                                            ? "bg-primary/5 border-primary shadow-sm shadow-primary/10"
                                            : "bg-background border-border hover:border-foreground/20"
                                            }`}
                                    >
                                        <div>
                                            <p className="font-medium text-foreground flex items-center gap-2">
                                                {repo.fullName}
                                                {repo.isConfigRepository && (
                                                    <span className="text-[10px] uppercase tracking-wider font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                                                        Active
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleSetConfigRepository(repo.isConfigRepository ? null : repo.id)}
                                            disabled={updating !== null}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${repo.isConfigRepository
                                                ? "bg-background border border-border text-foreground/80 hover:bg-muted"
                                                : "bg-primary text-primary-foreground hover:bg-primary/90"
                                                } ${updating === repo.id || updating === "clear" ? "opacity-50 cursor-wait" : ""}`}
                                        >
                                            {updating === repo.id ? "Setting..." : (repo.isConfigRepository ? "Clear Active" : "Set Active")}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
