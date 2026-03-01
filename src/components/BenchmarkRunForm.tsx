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
        initialData ? JSON.parse(initialData.models) : ["gpt-4o"]
    );
    const [selectedContextGroups, setSelectedContextGroups] = useState<string[]>(
        initialData ? JSON.parse(initialData.contextGroupIds) : []
    );
    const [runName, setRunName] = useState(initialData?.name || "");
    const [isSaving, setIsSaving] = useState(false);
    const [ollamaModels, setOllamaModels] = useState<string[]>([]);

    useEffect(() => {
        async function loadOllamaModels() {
            try {
                const models = await getOllamaModels();
                setOllamaModels(models.map(m => m.name));
            } catch (err) {
                console.error("Failed to load Ollama models", err);
            }
        }
        loadOllamaModels();
    }, []);

    const cloudModels: string[] = [];
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
                        <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {availableModels.map(model => (
                                <div
                                    key={model}
                                    onClick={() => toggleModel(model)}
                                    className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${selectedModels.includes(model)
                                        ? "bg-primary/5 border-primary/40 text-primary shadow-sm"
                                        : "bg-background/20 border-border/50 hover:border-foreground/10 text-foreground/60"
                                        }`}
                                >
                                    <span className="text-sm font-medium">{model}</span>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedModels.includes(model) ? "bg-primary border-primary" : "border-border/50"
                                        }`}>
                                        {selectedModels.includes(model) && (
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
                                No context groups found.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {contextGroups.map(group => (
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
                                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${selectedContextGroups.includes(group.id) ? "bg-primary border-primary" : "border-border/50"
                                            }`}>
                                            {selectedContextGroups.includes(group.id) && (
                                                <div className="w-2 h-2 bg-background rounded-sm rotate-45" />
                                            )}
                                        </div>
                                    </div>
                                ))}
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
