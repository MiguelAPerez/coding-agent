import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { saveSkill, deleteSkill } from "@/app/actions/skills";
import { Skill } from "@/types/agent";

export const SkillsManager = ({ initialSkills, agentId }: { initialSkills: Skill[], agentId: string | null }) => {
    const router = useRouter();
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ name: "", description: "", content: "", isEnabled: true });

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!agentId) {
            alert("Please select or create an agent first.");
            return;
        }
        try {
            await saveSkill({ ...editForm, id: isEditing || undefined, agentId });
            router.refresh();
        } catch {
            alert("Failed to save skill.");
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this skill?")) {
            try {
                await deleteSkill(id);
                router.refresh();
            } catch {
                alert("Failed to delete skill.");
            }
        }
    };

    const startNew = () => {
        setIsEditing("");
        setEditForm({ name: "", description: "", content: "", isEnabled: true });
    };

    const startEdit = (skill: Skill) => {
        setIsEditing(skill.id);
        setEditForm({ name: skill.name, description: skill.description, content: skill.content, isEnabled: !!skill.isEnabled });
    };


    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Management of Skills</h2>
                <button
                    onClick={startNew}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-all shadow-lg shadow-primary/20"
                >
                    Add Skill
                </button>
            </div>

            {isEditing !== null && (
                <div className="glass p-6 rounded-2xl border border-border/50 mb-8 space-y-4 animate-in slide-in-from-top-4 duration-300">
                    <h3 className="font-medium">{isEditing ? "Edit Skill" : "New Skill"}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs text-foreground/40">Skill Name</label>
                            <input
                                placeholder="E.g., Tailwind Expert"
                                value={editForm.name}
                                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                className="w-full bg-background border border-border rounded-xl px-4 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-foreground/40">Description</label>
                            <input
                                placeholder="What does this skill help with?"
                                value={editForm.description}
                                onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                className="w-full bg-background border border-border rounded-xl px-4 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-foreground/40">Content / Instructions</label>
                        <textarea
                            placeholder="Detailed instructions for the agent..."
                            rows={4}
                            value={editForm.content}
                            onChange={e => setEditForm({ ...editForm, content: e.target.value })}
                            className="w-full bg-background border border-border rounded-xl px-4 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>
                    <div className="flex justify-between items-center">
                        <label className="flex items-center gap-2 text-sm text-foreground/60 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={editForm.isEnabled}
                                onChange={e => setEditForm({ ...editForm, isEnabled: e.target.checked })}
                                className="accent-primary"
                            />
                            Enabled
                        </label>
                        <div className="flex gap-2">
                            <button onClick={() => setIsEditing(null)} className="px-4 py-2 text-sm font-medium hover:text-red-500 transition-colors">Cancel</button>
                            <button onClick={handleSave} className="px-6 py-2 bg-foreground text-background rounded-lg text-sm font-medium hover:opacity-90 transition-all">Save Skill</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {initialSkills.map(skill => (
                    <div key={skill.id} className="group glass p-6 rounded-2xl border border-border/30 hover:border-primary/30 transition-all hover:shadow-xl hover:shadow-primary/5">
                        <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-lg">{skill.name}</h4>
                            <div className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${skill.isEnabled ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                {skill.isEnabled ? 'Active' : 'Disabled'}
                            </div>
                        </div>
                        <p className="text-sm text-foreground/40 mb-4 line-clamp-2">{skill.description}</p>
                        <div className="flex gap-3 pt-2">
                            <button onClick={() => startEdit(skill)} className="text-xs font-medium text-foreground/60 hover:text-primary transition-colors">Edit</button>
                            <button onClick={() => handleDelete(skill.id)} className="text-xs font-medium text-foreground/60 hover:text-red-500 transition-colors">Delete</button>
                        </div>
                    </div>
                ))}
                {initialSkills.length === 0 && !isEditing && (
                    <div className="col-span-full py-12 text-center glass rounded-2xl border border-dashed border-border/50">
                        <p className="text-foreground/40">No skills defined yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
