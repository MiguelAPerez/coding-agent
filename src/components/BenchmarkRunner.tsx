"use client";

import React, { useState, useEffect } from "react";
import { runBenchmark } from "@/app/actions/agent";
import { getOllamaModels } from "@/app/actions/ollama";
import { ContextGroup } from "@/types/agent";

export const BenchmarkRunner = ({
    contextGroups
}: {
    contextGroups: ContextGroup[]
}) => {
    const [selectedModels, setSelectedModels] = useState<string[]>([]);
    const [selectedContextGroups, setSelectedContextGroups] = useState<string[]>([]);
    const [benchmarkName, setBenchmarkName] = useState("");
    const [isStarting, setIsStarting] = useState(false);
    const [ollamaModels, setOllamaModels] = useState<{ name: string, capabilities: string[] }[]>([]);

    useEffect(() => {
        async function loadOllamaModels() {
            try {
                const models = await getOllamaModels();
                setOllamaModels(models.map(m => {
                    let capabilities: string[] = [];
                    try {
                        if (m.details) {
                            const parsed = JSON.parse(m.details);
                            capabilities = parsed.capabilities || [];
                        }
                    } catch { }
                    return { name: m.name, capabilities };
                }));
            } catch (err) {
                console.error("Failed to load Ollama models", err);
            }
        }
        loadOllamaModels();
    }, []);

    const cloudModels: { name: string, capabilities: string[] }[] = [
        // {name: "gpt-4o", capabilities: ["tools", "insert"]},
    ];

    const availableModels = [...cloudModels, ...ollamaModels];

    const toggleModel = (model: string) => {
        setSelectedModels(prev =>
            prev.includes(model)
                ? prev.filter(m => m !== model)
                : [...prev, model]
        );
    };

    const toggleContextGroup = (id: string) => {
        setSelectedContextGroups(prev =>
            prev.includes(id)
                ? prev.filter(i => i !== id)
                : [...prev, id]
        );
    };

    const handleRun = async () => {
        if (!benchmarkName || selectedModels.length === 0 || selectedContextGroups.length === 0) {
            alert("Please fill in all fields.");
            return;
        }

        setIsStarting(true);
        try {
            await runBenchmark(benchmarkName, selectedModels, selectedContextGroups);
            setBenchmarkName("");
            setSelectedContextGroups([]);
            // The simulation/polling will be handled by the parent
        } catch {
            alert("Failed to start benchmark.");
        } finally {
            setIsStarting(false);
        }
    };

    return (
        <div className="glass p-8 rounded-3xl border border-border/50 space-y-8 animate-in fade-in zoom-in-95 duration-500">
            <div className="space-y-2">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    Create New Benchmark
                </h2>
                <p className="text-sm text-foreground/40">
                    Select models and context groups to compare performance and efficiency.
                </p>
            </div>

            <div className="space-y-6">
                <div className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-widest text-foreground/30 px-1">Benchmark Name</label>
                    <input
                        className="w-full bg-background/50 border border-border/50 rounded-2xl px-6 py-4 focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all outline-none text-lg font-medium"
                        placeholder="e.g., Code Gen Comparison v1"
                        value={benchmarkName}
                        onChange={e => setBenchmarkName(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <label className="text-xs font-bold uppercase tracking-widest text-foreground/30 px-1">Select Models</label>
                        <div className="grid grid-cols-1 gap-2">
                            {availableModels.map(model => (
                                <div
                                    key={model.name}
                                    onClick={() => toggleModel(model.name)}
                                    className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${selectedModels.includes(model.name)
                                        ? "bg-primary/5 border-primary/40 text-primary shadow-sm"
                                        : "bg-background/20 border-border/50 hover:border-foreground/10 text-foreground/60"
                                        }`}
                                >
                                    <div className="flex flex-col gap-1.5">
                                        <span className="text-sm font-medium">{model.name}</span>
                                        {(model.capabilities.includes("tools") || model.capabilities.includes("thinking")) && (
                                            <div className="flex gap-2">
                                                {model.capabilities.includes("tools") && <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20 font-bold tracking-widest uppercase">🔧 Tools</span>}
                                                {model.capabilities.includes("thinking") && <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 border border-purple-500/20 font-bold tracking-widest uppercase">🧠 Thinking</span>}
                                            </div>
                                        )}
                                    </div>
                                    <div className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedModels.includes(model.name) ? "bg-primary border-primary" : "border-border/50"
                                        }`}>
                                        {selectedModels.includes(model.name) && (
                                            <div className="w-1.5 h-1.5 bg-background rounded-full" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-xs font-bold uppercase tracking-widest text-foreground/30 px-1">Context Groups</label>
                        {contextGroups.length === 0 ? (
                            <div className="h-full flex items-center justify-center border-2 border-dashed border-border/30 rounded-3xl p-8 text-center text-foreground/20 italic">
                                No context groups found. Create one in the Context Groups tab first.
                            </div>
                        ) : (
                            <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                {Object.entries(
                                    contextGroups.reduce((acc, group) => {
                                        const cat = group.category || "Uncategorized";
                                        if (!acc[cat]) acc[cat] = [];
                                        acc[cat].push(group);
                                        return acc;
                                    }, {} as Record<string, ContextGroup[]>)
                                ).sort(([a], [b]) => a.localeCompare(b)).map(([category, groups]) => {
                                    const allSelected = groups.every(g => selectedContextGroups.includes(g.id));
                                    const someSelected = groups.some(g => selectedContextGroups.includes(g.id)) && !allSelected;

                                    return (
                                        <div key={category} className="space-y-3">
                                            <div
                                                onClick={() => {
                                                    const ids = groups.map(g => g.id);
                                                    if (allSelected) {
                                                        setSelectedContextGroups(prev => prev.filter(id => !ids.includes(id)));
                                                    } else {
                                                        setSelectedContextGroups(prev => Array.from(new Set([...prev, ...ids])));
                                                    }
                                                }}
                                                className="flex items-center justify-between px-2 cursor-pointer group/cat"
                                            >
                                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-foreground/30 group-hover/cat:text-primary transition-colors">
                                                    {category} ({groups.length})
                                                </h3>
                                                <div className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded transition-all ${allSelected ? 'bg-primary/20 text-primary' : someSelected ? 'bg-primary/10 text-primary/60' : 'bg-foreground/5 text-foreground/20'}`}>
                                                    {allSelected ? 'All Selected' : someSelected ? 'Partial' : 'Select All'}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 gap-2">
                                                {groups.map(group => (
                                                    <div
                                                        key={group.id}
                                                        onClick={() => toggleContextGroup(group.id)}
                                                        className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${selectedContextGroups.includes(group.id)
                                                            ? "bg-primary/5 border-primary/40 text-primary shadow-sm"
                                                            : "bg-background/20 border-border/50 hover:border-foreground/10 text-foreground/60"
                                                            }`}
                                                    >
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-medium truncate max-w-[150px]">{group.name}</span>
                                                            <span className="text-[10px] opacity-60">Template: {group.promptTemplate.slice(0, 20)}...</span>
                                                        </div>
                                                        <div className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center ${selectedContextGroups.includes(group.id) ? "bg-primary border-primary" : "border-border/50"
                                                            }`}>
                                                            {selectedContextGroups.includes(group.id) && (
                                                                <div className="w-2 h-2 bg-background rounded-sm rotate-45" />
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <button
                    onClick={handleRun}
                    disabled={isStarting || !benchmarkName || selectedModels.length === 0 || selectedContextGroups.length === 0}
                    className="w-full py-5 bg-primary text-primary-foreground rounded-2xl font-bold text-lg hover:opacity-90 disabled:opacity-50 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 mt-4"
                >
                    {isStarting ? (
                        <>
                            <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                            Initializing...
                        </>
                    ) : (
                        <>
                            <span className="text-xl">🚀</span>
                            Run {selectedModels.length * selectedContextGroups.length} Batch Evaluations
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
