"use client";

import React, { useState } from "react";
import { saveContextGroup, deleteContextGroup } from "@/app/actions/agent";
import { ContextGroup, Skill } from "@/types/agent";

export const ContextGroupManager = ({
    initialGroups,
    skills
}: {
    initialGroups: ContextGroup[];
    skills: Skill[];
}) => {
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({
        name: "",
        description: "",
        category: "",
        weight: 1,
        expectations: [] as { type: string; value: string }[],
        maxSentences: "" as string | number,
        systemContext: "",
        promptTemplate: "",
        skillIds: [] as string[]
    });

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await saveContextGroup({
                ...editForm,
                id: isEditing || undefined,
                skillIds: JSON.stringify(editForm.skillIds),
                expectations: JSON.stringify(editForm.expectations),
                weight: Number(editForm.weight),
                maxSentences: editForm.maxSentences ? Number(editForm.maxSentences) : undefined,
            });
            window.location.reload();
        } catch {
            alert("Failed to save context group.");
        }
    };

    const toggleSkill = (skillId: string) => {
        setEditForm(prev => ({
            ...prev,
            skillIds: prev.skillIds.includes(skillId)
                ? prev.skillIds.filter(id => id !== skillId)
                : [...prev.skillIds, skillId]
        }));
    };

    const startNew = () => {
        setIsEditing("");
        setEditForm({
            name: "",
            description: "",
            category: "Technical",
            weight: 1,
            expectations: [],
            maxSentences: "",
            systemContext: "",
            promptTemplate: "",
            skillIds: []
        });
    };

    const startEdit = (group: ContextGroup) => {
        setIsEditing(group.id);
        const skillIds = group.skillIds ? JSON.parse(group.skillIds) : [];
        const expectations = group.expectations ? JSON.parse(group.expectations) : [];
        setEditForm({
            name: group.name,
            description: group.description || "",
            category: group.category || "Technical",
            weight: group.weight || 1,
            expectations: expectations,
            maxSentences: group.maxSentences || "",
            systemContext: group.systemContext || "",
            promptTemplate: group.promptTemplate,
            skillIds: skillIds
        });
    };

    const addExpectation = () => {
        setEditForm(prev => ({
            ...prev,
            expectations: [...prev.expectations, { type: "contains", value: "" }]
        }));
    };

    const removeExpectation = (index: number) => {
        setEditForm(prev => ({
            ...prev,
            expectations: prev.expectations.filter((_, i) => i !== index)
        }));
    };

    const updateExpectation = (index: number, field: "type" | "value", value: string) => {
        setEditForm(prev => ({
            ...prev,
            expectations: prev.expectations.map((exp, i) =>
                i === index ? { ...exp, [field]: value } : exp
            )
        }));
    };


    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-foreground/80">Context Groups</h2>
                <button
                    onClick={startNew}
                    className="px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all text-sm font-medium"
                >
                    + New Group
                </button>
            </div>

            {isEditing !== null && (
                <div className="glass p-6 rounded-2xl border border-primary/30 animate-in fade-in slide-in-from-top-4 duration-300">
                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase text-foreground/40">Name</label>
                                <input
                                    className="w-full bg-background border border-border rounded-xl px-4 py-2"
                                    value={editForm.name}
                                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase text-foreground/40">Category</label>
                                <input
                                    className="w-full bg-background border border-border rounded-xl px-4 py-2"
                                    value={editForm.category}
                                    onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                                    placeholder="Technical, Reasoning, etc."
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase text-foreground/40">Weight</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    className="w-full bg-background border border-border rounded-xl px-4 py-2"
                                    value={editForm.weight}
                                    onChange={e => setEditForm({ ...editForm, weight: Number(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase text-foreground/40">Max Sentences</label>
                                <input
                                    type="number"
                                    className="w-full bg-background border border-border rounded-xl px-4 py-2"
                                    value={editForm.maxSentences}
                                    onChange={e => setEditForm({ ...editForm, maxSentences: e.target.value })}
                                    placeholder="Optional"
                                />
                            </div>
                            <div className="space-y-2 col-span-1">
                                <label className="text-xs font-semibold uppercase text-foreground/40 text-transparent select-none">Spacer</label>
                                <div className="text-[10px] text-foreground/20 italic mt-2">Adjust scoring weights and constraints.</div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase text-foreground/40">Description</label>
                            <input
                                className="w-full bg-background border border-border rounded-xl px-4 py-2"
                                value={editForm.description}
                                onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                            />
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-semibold uppercase text-foreground/40">Evaluation Expectations</label>
                                <button
                                    type="button"
                                    onClick={addExpectation}
                                    className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20 transition-all font-bold uppercase"
                                >
                                    + Add Expectation
                                </button>
                            </div>
                            <div className="space-y-2">
                                {editForm.expectations.map((exp, idx) => (
                                    <div key={idx} className="flex gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
                                        <select
                                            className="bg-background border border-border rounded-xl px-2 py-2 text-xs font-mono"
                                            value={exp.type}
                                            onChange={e => updateExpectation(idx, "type", e.target.value)}
                                        >
                                            <option value="contains">CONTAINS</option>
                                            <option value="not_contains">NOT_CONTAINS</option>
                                            <option value="regex">REGEX</option>
                                            <option value="exact">EXACT</option>
                                        </select>
                                        <input
                                            className="flex-1 bg-background border border-border rounded-xl px-4 py-2 text-sm font-mono"
                                            value={exp.value}
                                            onChange={e => updateExpectation(idx, "value", e.target.value)}
                                            placeholder={exp.type === "regex" ? "/pattern/i" : "Value to check..."}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeExpectation(idx)}
                                            className="p-2 text-foreground/20 hover:text-destructive transition-colors"
                                        >
                                            <span className="text-lg">×</span>
                                        </button>
                                    </div>
                                ))}
                                {editForm.expectations.length === 0 && (
                                    <div className="text-center py-4 border-2 border-dashed border-border/20 rounded-xl text-[10px] text-foreground/20 italic">
                                        No expectations defined. Add one to enable automated scoring.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase text-foreground/40">Base System Context (Default Persona)</label>
                            <textarea
                                className="w-full bg-background border border-border rounded-xl px-4 py-2 min-h-[60px]"
                                value={editForm.systemContext}
                                onChange={e => setEditForm({ ...editForm, systemContext: e.target.value })}
                                placeholder="Optional: Base level instructions used if no variations match..."
                            />
                        </div>


                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase text-foreground/40">Prompt Template</label>
                            <textarea
                                className="w-full bg-background border border-border rounded-xl px-4 py-2 min-h-[100px]"
                                value={editForm.promptTemplate}
                                onChange={e => setEditForm({ ...editForm, promptTemplate: e.target.value })}
                                placeholder="Instructions for this context group..."
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase text-foreground/40">Included Skills</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {skills.map(skill => (
                                    <div
                                        key={skill.id}
                                        onClick={() => toggleSkill(skill.id)}
                                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${editForm.skillIds.includes(skill.id)
                                            ? "bg-primary/10 border-primary/40 text-primary"
                                            : "bg-background/40 border-border hover:border-foreground/20"
                                            }`}
                                    >
                                        <div className={`w-3 h-3 rounded-full border ${editForm.skillIds.includes(skill.id) ? "bg-primary border-primary" : "border-border"
                                            }`} />
                                        <span className="text-xs truncate">{skill.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <button
                                type="button"
                                onClick={() => setIsEditing(null)}
                                className="px-4 py-2 text-sm text-foreground/60 hover:text-foreground"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-all font-mono"
                            >
                                SAVE_CONFIG
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="space-y-10">
                {Object.entries(
                    initialGroups.reduce((acc, group) => {
                        const cat = group.category || "Uncategorized";
                        if (!acc[cat]) acc[cat] = [];
                        acc[cat].push(group);
                        return acc;
                    }, {} as Record<string, ContextGroup[]>)
                ).sort(([a], [b]) => a.localeCompare(b)).map(([category, groups]) => (
                    <div key={category} className="space-y-4">
                        <div className="flex items-center gap-4 px-2">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/40">{category}</h3>
                            <div className="flex-1 h-[1px] bg-border/40" />
                            <span className="text-[10px] font-bold text-foreground/20 uppercase">{groups.length} Prompts</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {groups.map(group => (
                                <div key={group.id} className="glass p-5 rounded-2xl border border-border/50 hover:border-primary/30 transition-all group">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-foreground/80">{group.name}</h3>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => startEdit(group)} className="p-1 hover:text-primary"><span className="text-xs">Edit</span></button>
                                            <button onClick={() => deleteContextGroup(group.id)} className="p-1 hover:text-destructive"><span className="text-xs">Delete</span></button>
                                        </div>
                                    </div>
                                    <p className="text-sm text-foreground/40 line-clamp-2 mb-4">
                                        {group.description || "No description provided."}
                                    </p>
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {group.weight !== null && (
                                            <span className="text-[10px] bg-amber-500/10 text-amber-600 font-bold px-2 py-0.5 rounded-md uppercase">
                                                w:{group.weight}
                                            </span>
                                        )}
                                        {group.expectations && (
                                            <span className="text-[10px] bg-emerald-500/10 text-emerald-600 font-bold px-2 py-0.5 rounded-md uppercase">
                                                {JSON.parse(group.expectations).length} Expectations
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {group.skillIds && JSON.parse(group.skillIds).length > 0 && (
                                            <span className="text-[10px] bg-foreground/5 text-foreground/40 px-2 py-0.5 rounded-full border border-border">
                                                {JSON.parse(group.skillIds).length} Skills
                                            </span>
                                        )}
                                        <span className="text-[10px] bg-foreground/5 text-foreground/40 px-2 py-0.5 rounded-full border border-border">
                                            {group.promptTemplate.length} chars
                                        </span>
                                        <span className="text-[10px] bg-foreground/5 text-foreground/40 px-2 py-0.5 rounded-full border border-border">
                                            ~{Math.ceil(group.promptTemplate.length / 4)} tokens
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
