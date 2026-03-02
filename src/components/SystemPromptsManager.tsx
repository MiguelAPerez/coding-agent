"use client";

import React, { useState } from "react";
import { saveSystemPrompt, deleteSystemPrompt } from "@/app/actions/prompts";
import { SystemPrompt } from "@/types/agent";

export const SystemPromptsManager = ({
    initialPrompts
}: {
    initialPrompts: SystemPrompt[];
}) => {
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({
        name: "",
        content: ""
    });

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await saveSystemPrompt({
                ...editForm,
                id: isEditing || undefined
            });
            window.location.reload();
        } catch {
            alert("Failed to save system prompt.");
        }
    };

    const startNew = () => {
        setIsEditing("");
        setEditForm({
            name: "",
            content: ""
        });
    };

    const startEdit = (prompt: SystemPrompt) => {
        setIsEditing(prompt.id);
        setEditForm({
            name: prompt.name,
            content: prompt.content
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <h2 className="text-xl font-semibold text-foreground/80">System Prompts</h2>
                    <p className="text-xs text-foreground/40 font-medium uppercase tracking-tight">Individual persona and behavior instructions</p>
                </div>
                <button
                    onClick={startNew}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-all text-sm font-bold shadow-lg shadow-primary/20"
                >
                    + New Persona
                </button>
            </div>

            {isEditing !== null && (
                <div className="glass p-6 rounded-2xl border border-primary/30 animate-in fade-in slide-in-from-top-4 duration-300">
                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase text-foreground/40">Persona Name</label>
                            <input
                                className="w-full bg-background border border-border rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                value={editForm.name}
                                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                placeholder="e.g., Expert Architect, Pirate, Strict Reviewer"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase text-foreground/40">System Instructions (Content)</label>
                            <textarea
                                className="w-full bg-background border border-border rounded-xl px-4 py-2 min-h-[150px] font-mono text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                value={editForm.content}
                                onChange={e => setEditForm({ ...editForm, content: e.target.value })}
                                placeholder="You are a helpful coding assistant that..."
                                required
                            />
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
                                className="px-6 py-2 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-all shadow-md shadow-primary/10"
                            >
                                Save Persona
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {initialPrompts.map(prompt => (
                    <div key={prompt.id} className="glass p-5 rounded-2xl border border-border/50 hover:border-primary/40 transition-all group flex flex-col h-full bg-foreground/[0.02]">
                        <div className="flex justify-between items-start mb-3">
                            <h3 className="font-bold text-foreground/80 group-hover:text-primary transition-colors">{prompt.name}</h3>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => startEdit(prompt)}
                                    className="p-1.5 bg-foreground/5 hover:bg-primary/10 hover:text-primary rounded-lg transition-all"
                                    title="Edit"
                                >
                                    <span className="text-xs font-bold uppercase">Edit</span>
                                </button>
                                <button
                                    onClick={() => { if (confirm('Delete this persona?')) deleteSystemPrompt(prompt.id) }}
                                    className="p-1.5 bg-foreground/5 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-all"
                                    title="Delete"
                                >
                                    <span className="text-xs font-bold uppercase">Del</span>
                                </button>
                            </div>
                        </div>
                        <p className="text-xs text-foreground/40 line-clamp-4 italic mb-4 flex-1">
                            &quot;{prompt.content}&quot;
                        </p>
                        <div className="flex justify-between items-center pt-3 border-t border-border/30">
                            <span className="text-[10px] font-mono text-foreground/20 uppercase">
                                {prompt.content.length} chars
                            </span>
                            <span className="text-[10px] font-mono text-foreground/20">
                                {new Date(prompt.updatedAt).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                ))}

                {initialPrompts.length === 0 && !isEditing && (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-border/30 rounded-3xl opacity-40">
                        <p className="text-sm italic">No system personas defined yet.</p>
                        <button onClick={startNew} className="text-primary font-bold hover:underline mt-2">Create your first prompt</button>
                    </div>
                )}
            </div>
        </div>
    );
};
