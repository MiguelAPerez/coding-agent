"use client";

import React, { useState, useEffect } from "react";
import { saveBenchmarkRun } from "@/app/actions/agent";
import { getOllamaModels } from "@/app/actions/ollama";
import { ContextGroup, BenchmarkRun } from "@/types/agent";

export const BenchmarkRunForm = ({
    contextGroups,
    initialData,
    onSuccess,
    onCancel
}: {
    contextGroups: ContextGroup[];
    initialData?: BenchmarkRun;
    onSuccess: () => void;
    onCancel: () => void;
}) => {
    const [selectedModels, setSelectedModels] = useState<string[]>(
        initialData ? JSON.parse(initialData.models) : []
    );
    const [selectedContextGroups, setSelectedContextGroups] = useState<string[]>(
        initialData ? JSON.parse(initialData.contextGroupIds) : []
    );
    const [runName, setRunName] = useState(initialData?.name || "");
    const [isSaving, setIsSaving] = useState(false);
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

    const cloudModels: { name: string, capabilities: string[] }[] = [];
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

    const handleSave = async () => {
        if (!runName || selectedModels.length === 0 || selectedContextGroups.length === 0) {
            alert("Please fill in all fields.");
            return;
        }

        setIsSaving(true);
        try {
            await saveBenchmarkRun({
                id: initialData?.id,
                name: runName,
                models: selectedModels,
                contextGroupIds: selectedContextGroups
            });
            onSuccess();
        } catch {
            alert("Failed to save run definition.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="glass p-8 rounded-3xl border border-border/50 space-y-8 animate-in fade-in zoom-in-95 duration-500">
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        {initialData ? "Edit Run Definition" : "New Run Definition"}
                    </h2>
                    <p className="text-sm text-foreground/40">
                        Define models and context groups for this run.
                    </p>
                </div>
                <button
                    onClick={onCancel}
                    className="p-2 hover:bg-foreground/5 rounded-full transition-colors text-foreground/40"
                >
                    ✕
                </button>
            </div>

            <div className="space-y-6">
                <div className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-widest text-foreground/30 px-1">Run Name</label>
                    <input
                        className="w-full bg-background/50 border border-border/50 rounded-2xl px-6 py-4 focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all outline-none text-lg font-medium"
                        placeholder="e.g., Code Gen Comparison v1"
                        value={runName}
                        onChange={e => setRunName(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <label className="text-xs font-bold uppercase tracking-widest text-foreground/30 px-1">Select Models</label>
                        <div className="grid grid-cols-1 gap-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
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
                        <div className="flex justify-between items-center px-1">
                            <label className="text-xs font-bold uppercase tracking-widest text-foreground/30">Context Groups</label>
                            <span className="text-[10px] font-bold uppercase py-0.5 px-2 bg-primary/10 text-primary rounded-full">
                                {selectedContextGroups.length} Selected
                            </span>
                        </div>
                        {contextGroups.length === 0 ? (
                            <div className="h-full flex items-center justify-center border-2 border-dashed border-border/30 rounded-3xl p-8 text-center text-foreground/20 italic">
                                No context groups found.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
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
                                                        <div className="flex flex-col flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-sm font-bold truncate">{group.name}</span>
                                                                {group.weight !== null && (
                                                                    <span className="text-[9px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded font-black tracking-tighter">
                                                                        W:{group.weight}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="text-[10px] opacity-40 line-clamp-1 italic">{group.description || "No description"}</span>
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

                <div className="flex gap-4 pt-4">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-4 bg-background/50 text-foreground/60 rounded-2xl font-bold text-lg hover:bg-background/80 transition-all border border-border/50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !runName || selectedModels.length === 0 || selectedContextGroups.length === 0}
                        className="flex-[2] py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-lg hover:opacity-90 disabled:opacity-50 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3"
                    >
                        {isSaving ? (
                            <>
                                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                {initialData ? "Update Run Definition" : "Save Run Definition"}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
