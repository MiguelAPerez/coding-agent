import React, { useState } from "react";
import { Skill } from "@/types/agent";
import { saveSkill } from "@/app/actions/skills";

const SKILL_TEMPLATE = `# Capability Name

## Purpose
Describe what this skill enables the agent to do.

## Usage
Provide examples of how to invoke this skill or what parameters it expects.

## Implementation Details
Briefly explain how the script works if necessary.
`;

const INITIAL_SKILL_CONTENT = "export async function main() {\n  console.log('Hello from skill');\n}";

interface SkillEditorProps {
    skill: Skill | null;
    isNew: boolean;
    onComplete: () => void;
    onCancel: () => void;
}

export function SkillEditor({ skill, isNew, onComplete, onCancel }: SkillEditorProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [editForm, setEditForm] = useState({
        name: skill?.name || "",
        description: skill?.description || "",
        content: isNew ? SKILL_TEMPLATE : (skill?.content || ""),
        runtime: skill?.runtime || "docker",
        envVars: skill?.envVars || {},
        scriptFile: skill?.scriptFile || (isNew ? "index.ts" : ""),
        scriptContent: skill?.scriptContent || (isNew ? INITIAL_SKILL_CONTENT : ""),
        requirementsFile: skill?.requirementsFile || "",
        requirementsContent: skill?.requirementsContent || ""
    });

    const isManaged = skill?.isManaged || false;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isManaged) return;
        
        setIsSaving(true);
        try {
            await saveSkill({
                id: isNew ? undefined : skill?.id,
                ...editForm
            });
            onComplete();
        } catch (error) {
            console.error("Failed to save skill:", error);
            alert("Failed to save skill");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-2xl z-50 overflow-y-auto p-4 md:p-8 animate-in fade-in zoom-in-95 duration-300">
            <form onSubmit={handleSave} className="max-w-5xl mx-auto space-y-8 pb-12">
                <div className="flex justify-between items-center sticky top-0 bg-background/50 backdrop-blur-md py-4 z-10 border-b border-border/30">
                    <div>
                        <h2 className="text-2xl font-black italic uppercase tracking-tight">
                            {isNew ? "New Skill" : (isManaged ? `Viewing: ${editForm.name}` : `Editing: ${editForm.name}`)}
                            {isManaged && <span className="ml-3 text-[10px] bg-primary/10 text-primary px-2 py-1 rounded not-italic font-black tracking-widest">READ ONLY</span>}
                        </h2>
                        <p className="text-xs text-foreground/40 font-medium">
                            {isManaged ? "System skills are managed by the core platform." : "Configure skill metadata and execution script"}
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <button type="button" onClick={onCancel} className="px-6 py-2 text-sm font-bold text-foreground/40">{isManaged ? "Close" : "Cancel"}</button>
                        {!isManaged && (
                            <button 
                                type="submit" 
                                disabled={isSaving}
                                className="px-8 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-black uppercase italic shadow-xl shadow-primary/20 disabled:opacity-50"
                            >
                                {isSaving ? "Saving..." : "Save Capability"}
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-foreground/30 ml-1">Name</label>
                                    <input
                                        required
                                        readOnly={isManaged}
                                        className="w-full bg-background border-2 border-border focus:border-primary/50 rounded-2xl px-5 py-3 text-sm transition-all outline-none disabled:opacity-50"
                                        value={editForm.name}
                                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                        placeholder="e.g. Stock Analysis"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-foreground/30 ml-1">Script Filename</label>
                                    <input
                                        required
                                        readOnly={isManaged}
                                        className="w-full bg-background border-2 border-border focus:border-primary/50 rounded-2xl px-5 py-3 text-sm font-mono transition-all outline-none disabled:opacity-50"
                                        value={editForm.scriptFile}
                                        onChange={e => setEditForm({ ...editForm, scriptFile: e.target.value })}
                                        placeholder="index.ts"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-foreground/30 ml-1">Description</label>
                                <input
                                    required
                                    readOnly={isManaged}
                                    className="w-full bg-background border-2 border-border focus:border-primary/50 rounded-2xl px-5 py-3 text-sm transition-all outline-none disabled:opacity-50"
                                    value={editForm.description}
                                    onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                    placeholder="Briefly describe what this skill does..."
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black uppercase tracking-widest text-foreground/30 ml-1">Capability Content (SKILL.md)</label>
                                <div className="flex items-center gap-2 text-[10px] text-foreground/20 italic">
                                    <i className="ri-markdown-line"></i> Markdown Supported
                                </div>
                            </div>
                            <textarea
                                required
                                readOnly={isManaged}
                                className="w-full bg-background border-2 border-border focus:border-primary/50 rounded-3xl px-6 py-4 min-h-[250px] text-sm leading-relaxed transition-all outline-none resize-none disabled:opacity-50"
                                value={editForm.content}
                                onChange={e => setEditForm({ ...editForm, content: e.target.value })}
                                placeholder="# How to use this skill..."
                            />
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-foreground/30 ml-1">Script Implementation</label>
                            <div className="relative border-2 border-border rounded-3xl bg-[#0d1117] overflow-hidden group/editor">
                                <div className="absolute left-0 top-0 bottom-0 w-12 bg-black/40 border-r border-white/5 flex flex-col items-center pt-4 text-[10px] text-white/20 select-none font-mono">
                                    {Array.from({ length: Math.max(15, editForm.scriptContent.split('\n').length) }).map((_, i) => (
                                        <div key={i} className="h-[1.6em] leading-[1.6em]">{i + 1}</div>
                                    ))}
                                </div>
                                <textarea
                                    readOnly={isManaged}
                                    className="w-full pl-16 bg-transparent text-white/90 px-6 py-4 min-h-[400px] font-mono text-xs focus:outline-none transition-all resize-none leading-[1.6em] disabled:opacity-50"
                                    value={editForm.scriptContent}
                                    onChange={e => setEditForm({ ...editForm, scriptContent: e.target.value })}
                                    placeholder="// Your entry point function main() here..."
                                    spellCheck={false}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="glass p-8 rounded-[2rem] border-2 border-border/50 space-y-6">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-foreground/30">Sandbox Environment</label>
                                <div className={`grid grid-cols-2 gap-3 p-1 bg-background/50 rounded-xl border border-border/50 ${isManaged ? 'opacity-50 pointer-events-none' : ''}`}>
                                    {(['local', 'docker'] as const).map(r => (
                                        <button
                                            key={r}
                                            type="button"
                                            disabled={isManaged}
                                            onClick={() => setEditForm({ ...editForm, runtime: r })}
                                            className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                                editForm.runtime === r 
                                                    ? (r === 'docker' ? 'bg-primary text-primary-foreground shadow-lg' : 'bg-destructive text-destructive-foreground shadow-lg')
                                                    : 'text-foreground/40 hover:text-foreground/60'
                                            }`}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[10px] text-foreground/40 leading-relaxed px-1 font-medium italic">
                                    {editForm.runtime === 'docker' 
                                        ? "Highly isolated container execution. Recommended for dynamic code." 
                                        : "Direct host execution. RISK: Higher performance but lower security isolation."}
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-foreground/30">Environment Variables</label>
                                    {!isManaged && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const key = prompt("Variable name (e.g. GITHUB_TOKEN):");
                                                if (key) setEditForm({ ...editForm, envVars: { ...editForm.envVars, [key]: "" } });
                                            }}
                                            className="text-[9px] font-black uppercase tracking-tighter bg-foreground/5 text-foreground/60 px-2 py-1 rounded-lg border border-border italic"
                                        >
                                            + New Var
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                                    {Object.entries(editForm.envVars).map(([key, value]) => (
                                        <div key={key} className="flex gap-2 items-center group/var">
                                            <div className="text-[10px] font-mono text-primary w-24 truncate">{key}</div>
                                            <input
                                                readOnly={isManaged}
                                                className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary/30 disabled:opacity-50"
                                                value={value}
                                                onChange={e => setEditForm({ ...editForm, envVars: { ...editForm.envVars, [key]: e.target.value } })}
                                            />
                                            {!isManaged && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const n = { ...editForm.envVars };
                                                        delete n[key];
                                                        setEditForm({ ...editForm, envVars: n });
                                                    }}
                                                    className="opacity-0 group-hover/var:opacity-100 text-destructive p-1"
                                                >
                                                    <i className="ri-close-line"></i>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    {Object.keys(editForm.envVars).length === 0 && (
                                        <div className="text-[10px] text-foreground/20 text-center py-4 border border-dashed border-border/50 rounded-xl">No custom variables</div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-foreground/30">Requirements</label>
                                <input
                                    readOnly={isManaged}
                                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs font-mono mb-2 disabled:opacity-50"
                                    value={editForm.requirementsFile}
                                    onChange={e => setEditForm({ ...editForm, requirementsFile: e.target.value })}
                                    placeholder="package.json, requirements.txt"
                                />
                                <textarea
                                    readOnly={isManaged}
                                    className="w-full bg-[#0d1117] border border-border rounded-xl px-5 py-4 min-h-[150px] font-mono text-[10px] text-white/50 focus:outline-none resize-none disabled:opacity-50"
                                    value={editForm.requirementsContent}
                                    onChange={e => setEditForm({ ...editForm, requirementsContent: e.target.value })}
                                    placeholder="List dependencies..."
                                />
                            </div>
                        </div>
                        
                        <div className="p-6 border-2 border-dashed border-border/50 rounded-[2rem] space-y-4 opacity-40 grayscale group-hover:opacity-100 group-hover:grayscale-0 transition-all">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground/40 text-center">Injected Context</h4>
                            <div className="space-y-2">
                                <div className="bg-foreground/5 p-3 rounded-xl border border-border/50">
                                    <div className="text-[10px] font-mono text-primary mb-1 uppercase tracking-tighter">REPO_IDS</div>
                                    <div className="text-[9px] text-foreground/40 tracking-tight leading-snug">Project structure context for intelligent search operations.</div>
                                </div>
                                <div className="bg-foreground/5 p-3 rounded-xl border border-border/50">
                                    <div className="text-[10px] font-mono text-primary mb-1 uppercase tracking-tighter">USER_ID</div>
                                    <div className="text-[9px] text-foreground/40 tracking-tight leading-snug">Encrypted session identifier for user-specific operations.</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
