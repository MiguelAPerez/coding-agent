"use client";

import React, { useState } from "react";
import { saveSystemPromptSet, deleteSystemPromptSet } from "@/app/actions/prompts";
import { SystemPrompt, SystemPromptSet } from "@/types/agent";

export const SystemPromptSetManager = ({
    initialSets,
    prompts
}: {
    initialSets: SystemPromptSet[];
    prompts: SystemPrompt[];
}) => {
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({
        name: "",
        description: "",
        systemPromptIds: [] as string[]
    });

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editForm.systemPromptIds.length === 0) {
            alert("Please select at least one system prompt for this set.");
            return;
        }
        try {
            await saveSystemPromptSet({
                ...editForm,
                id: isEditing || undefined
            });
            window.location.reload();
        } catch {
            alert("Failed to save prompt set.");
        }
    };

    const togglePrompt = (id: string) => {
        setEditForm(prev => ({
            ...prev,
            systemPromptIds: prev.systemPromptIds.includes(id)
                ? prev.systemPromptIds.filter(i => i !== id)
                : [...prev.systemPromptIds, id]
        }));
    };

    const startNew = () => {
        setIsEditing("");
        setEditForm({
            name: "",
            description: "",
            systemPromptIds: []
        });
    };

    const startEdit = (set: SystemPromptSet) => {
        setIsEditing(set.id);
        const ids = set.systemPromptIds ? JSON.parse(set.systemPromptIds) : [];
        setEditForm({
            name: set.name,
            description: set.description || "",
            systemPromptIds: ids
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <h2 className="text-xl font-semibold text-foreground/80">Prompt Sets</h2>
                    <p className="text-xs text-foreground/40 font-medium uppercase tracking-tight">Groups of personas for comparative testing</p>
                </div>
                <button
                    onClick={startNew}
                    className="px-4 py-2 bg-purple-500 text-white rounded-xl hover:opacity-90 transition-all text-sm font-bold shadow-lg shadow-purple-500/20"
                >
                    + New Set
                </button>
            </div>

            {isEditing !== null && (
                <div className="glass p-6 rounded-2xl border border-purple-500/30 animate-in fade-in slide-in-from-top-4 duration-300">
                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase text-foreground/40">Set Name</label>
                                <input
                                    className="w-full bg-background border border-border rounded-xl px-4 py-2 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                                    value={editForm.name}
                                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                    placeholder="e.g., Architecture Personas, Tone Comparison"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase text-foreground/40">Description</label>
                                <input
                                    className="w-full bg-background border border-border rounded-xl px-4 py-2 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                                    value={editForm.description}
                                    onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                    placeholder="Optional: What is this group testing?"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-semibold uppercase text-foreground/40">Include Personas</label>
                                <span className="text-[10px] font-bold bg-purple-500/10 text-purple-600 px-2 py-0.5 rounded-full uppercase">
                                    {editForm.systemPromptIds.length} Selected
                                </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {prompts.map(prompt => (
                                    <div
                                        key={prompt.id}
                                        onClick={() => togglePrompt(prompt.id)}
                                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${editForm.systemPromptIds.includes(prompt.id)
                                            ? "bg-purple-500/5 border-purple-500/40 text-purple-700 shadow-sm shadow-purple-500/5"
                                            : "bg-background/40 border-border hover:border-foreground/10"
                                            }`}
                                    >
                                        <div className={`shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${editForm.systemPromptIds.includes(prompt.id) ? "bg-purple-500 border-purple-500" : "border-border"
                                            }`}>
                                            {editForm.systemPromptIds.includes(prompt.id) && (
                                                <span className="text-[10px] text-white">✓</span>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold truncate leading-none mb-1">{prompt.name}</p>
                                            <p className="text-[10px] opacity-40 truncate">{prompt.content}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
                            <button
                                type="button"
                                onClick={() => setIsEditing(null)}
                                className="px-4 py-2 text-sm text-foreground/60 hover:text-foreground font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2 bg-purple-500 text-white rounded-xl font-bold hover:opacity-90 transition-all shadow-md shadow-purple-500/10"
                            >
                                Save Prompt Set
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {initialSets.map(set => (
                    <div key={set.id} className="glass p-6 rounded-2xl border border-border/50 hover:border-purple-500/40 transition-all group relative overflow-hidden bg-foreground/[0.02]">
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div className="space-y-1">
                                <h3 className="font-bold text-lg text-foreground/80 group-hover:text-purple-600 transition-colors">{set.name}</h3>
                                <p className="text-xs text-foreground/40">{set.description || "No description provided."}</p>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => startEdit(set)}
                                    className="p-1.5 bg-foreground/5 hover:bg-purple-500/10 hover:text-purple-600 rounded-lg transition-all"
                                >
                                    <span className="text-xs font-bold uppercase">Edit</span>
                                </button>
                                <button
                                    onClick={() => { if (confirm('Delete this set?')) deleteSystemPromptSet(set.id) }}
                                    className="p-1.5 bg-foreground/5 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-all"
                                >
                                    <span className="text-xs font-bold uppercase">Del</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 mb-4 relative z-10">
                            {(() => {
                                const ids = set.systemPromptIds ? JSON.parse(set.systemPromptIds) : [];
                                return ids.map((id: string) => {
                                    const p = prompts.find(prompt => prompt.id === id);
                                    if (!p) return null;
                                    return (
                                        <span key={id} className="text-[10px] bg-purple-500/10 text-purple-600 px-2 py-0.5 rounded-md font-bold uppercase tracking-tight">
                                            {p.name}
                                        </span>
                                    );
                                });
                            })()}
                        </div>

                        <div className="pt-4 border-t border-border/30 flex justify-between items-center relative z-10">
                            <span className="text-[10px] font-mono text-foreground/20 uppercase">
                                {JSON.parse(set.systemPromptIds).length} Personas
                            </span>
                            <span className="text-[10px] font-mono text-foreground/20">
                                {new Date(set.updatedAt).toLocaleDateString()}
                            </span>
                        </div>

                        <div className="absolute top-0 right-0 p-8 text-purple-500/5 rotate-12 pointer-events-none">
                            <span className="text-6xl font-black">SET</span>
                        </div>
                    </div>
                ))}

                {initialSets.length === 0 && !isEditing && (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-border/30 rounded-3xl opacity-40">
                        <p className="text-sm italic">No prompt sets grouped yet.</p>
                        <button onClick={startNew} className="text-purple-500 font-bold hover:underline mt-2">Create your first set</button>
                    </div>
                )}
            </div>
        </div>
    );
};
