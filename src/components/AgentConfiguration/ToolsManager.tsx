import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { saveTool, deleteTool } from "@/app/actions/tools";
import { Tool } from "@/types/agent";

export const ToolsManager = ({ initialTools, agentId }: { initialTools: Tool[], agentId: string | null }) => {
    const router = useRouter();
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ name: "", description: "", schema: "", isEnabled: true });

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!agentId) {
            alert("Please select or create an agent first.");
            return;
        }
        try {
            await saveTool({ ...editForm, id: isEditing || undefined, agentId });
            router.refresh();
        } catch {
            alert("Failed to save tool.");
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this tool?")) {
            try {
                await deleteTool(id);
                router.refresh();
            } catch {
                alert("Failed to delete tool.");
            }
        }
    };

    const startNew = () => {
        setIsEditing("");
        setEditForm({ name: "", description: "", schema: '{\n  "name": "example",\n  "parameters": {\n    "type": "object",\n    "properties": {}\n  }\n}', isEnabled: true });
    };

    const startEdit = (tool: Tool) => {
        setIsEditing(tool.id);
        setEditForm({ name: tool.name, description: tool.description, schema: tool.schema, isEnabled: !!tool.isEnabled });
    };


    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-foreground/80">Custom Tools</h2>
                <button
                    onClick={startNew}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-all shadow-lg shadow-primary/20"
                >
                    Add Tool
                </button>
            </div>

            {isEditing !== null && (
                <div className="glass p-6 rounded-2xl border border-border/50 mb-8 space-y-4 animate-in slide-in-from-top-4 duration-300">
                    <h3 className="font-medium">{isEditing ? "Edit Tool" : "New Tool"}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs text-foreground/40 font-medium">Tool Name</label>
                            <input
                                placeholder="E.g., fetch_weather"
                                value={editForm.name}
                                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                className="w-full bg-background border border-border rounded-xl px-4 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-foreground/40 font-medium">Description</label>
                            <input
                                placeholder="What does this tool do?"
                                value={editForm.description}
                                onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                className="w-full bg-background border border-border rounded-xl px-4 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-foreground/40 font-medium">JSON Schema</label>
                        <textarea
                            placeholder='{"name": "...", "parameters": {...}}'
                            rows={6}
                            value={editForm.schema}
                            onChange={e => setEditForm({ ...editForm, schema: e.target.value })}
                            className="w-full bg-background border border-border rounded-xl px-4 py-2 font-mono text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
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
                            <button onClick={handleSave} className="px-6 py-2 bg-foreground text-background rounded-lg text-sm font-medium hover:opacity-90 transition-all">Save Tool</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {initialTools.map(tool => (
                    <div key={tool.id} className="group glass p-6 rounded-2xl border border-border/30 hover:border-primary/30 transition-all hover:shadow-xl hover:shadow-primary/5">
                        <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-lg">{tool.name}</h4>
                            <div className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${tool.isEnabled ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                {tool.isEnabled ? 'Active' : 'Disabled'}
                            </div>
                        </div>
                        <p className="text-sm text-foreground/40 mb-4 line-clamp-2">{tool.description}</p>
                        <div className="flex gap-3 pt-2">
                            <button onClick={() => startEdit(tool)} className="text-xs font-medium text-foreground/60 hover:text-primary transition-colors">Edit</button>
                            <button onClick={() => handleDelete(tool.id)} className="text-xs font-medium text-foreground/60 hover:text-red-500 transition-colors">Delete</button>
                        </div>
                    </div>
                ))}
                {initialTools.length === 0 && !isEditing && (
                    <div className="col-span-full py-12 text-center glass rounded-2xl border border-dashed border-border/50">
                        <p className="text-foreground/40">No tools defined yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
