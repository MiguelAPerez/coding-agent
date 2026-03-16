import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { linkSkillToAgent, unlinkSkillFromAgent } from "@/app/actions/skills";
import { Skill, AgentConfig } from "@/types/agent";

export const SkillsManager = ({
    initialSkills,
    agent
}: {
    initialSkills: Skill[];
    agent: AgentConfig | null;
}) => {
    const router = useRouter();
    const [isAdding, setIsAdding] = useState(false);

    if (!agent) {
        return (
            <div className="py-12 text-center glass rounded-3xl border-2 border-dashed border-border/30 opacity-50">
                <p className="text-sm italic">Select or create an agent to manage its skills.</p>
            </div>
        );
    }

    const linkedSkillIds = agent.skillIds || [];
    const linkedSkills = initialSkills.filter(s => linkedSkillIds.includes(s.id));
    const availableSkills = initialSkills.filter(s => !linkedSkillIds.includes(s.id));

    const handleLink = async (skillId: string) => {
        try {
            await linkSkillToAgent(agent.id, skillId);
            setIsAdding(false);
            router.refresh();
        } catch {
            alert("Failed to link skill.");
        }
    };

    const handleUnlink = async (skillId: string) => {
        if (confirm("Remove this skill from this agent?")) {
            try {
                await unlinkSkillFromAgent(agent.id, skillId);
                router.refresh();
            } catch {
                alert("Failed to unlink skill.");
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <h2 className="text-xl font-semibold text-foreground/80">Agent Skills</h2>
                    <p className="text-xs text-foreground/40 font-medium uppercase tracking-tight">Active capabilities for {agent.name}</p>
                </div>
                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="px-4 py-2 bg-foreground text-background rounded-xl hover:opacity-90 transition-all text-sm font-bold"
                    >
                        + Add Skill
                    </button>
                )}
            </div>

            {isAdding && (
                <div className="glass p-6 rounded-2xl border border-primary/30 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-foreground/80">Select Skill to Add</h3>
                        <button onClick={() => setIsAdding(false)} className="text-xs text-foreground/40 hover:text-foreground font-medium">Cancel</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {availableSkills.map(skill => (
                            <button
                                key={skill.id}
                                onClick={() => handleLink(skill.id)}
                                className="flex flex-col text-left p-4 rounded-xl border border-border/50 hover:border-primary/50 hover:bg-primary/[0.02] transition-all group"
                            >
                                <span className="font-bold text-sm text-foreground/80 group-hover:text-primary">{skill.name}</span>
                                <span className="text-[10px] text-foreground/40 line-claps-1">{skill.description}</span>
                            </button>
                        ))}
                        {availableSkills.length === 0 && (
                            <p className="col-span-full py-4 text-center text-xs text-foreground/40 italic">No more skills available in your library.</p>
                        )}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {linkedSkills.map(skill => (
                    <div key={skill.id} className="glass p-5 rounded-2xl border border-border/50 hover:border-red-500/30 transition-all group flex flex-col h-full bg-foreground/[0.02]">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-foreground/80">{skill.name}</h3>
                            <button
                                onClick={() => handleUnlink(skill.id)}
                                className="text-[10px] font-bold text-foreground/20 hover:text-destructive uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all"
                            >
                                Remove
                            </button>
                        </div>
                        <p className="text-xs text-foreground/40 line-clamp-2 mb-3">
                            {skill.description}
                        </p>
                        <div className="mt-auto pt-2 flex items-center justify-between border-t border-border/30">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${skill.isManaged ? 'text-primary' : 'text-foreground/40'}`}>
                                {skill.isManaged ? 'System Skill' : 'User Skill'}
                            </span>
                            <div className="flex gap-2">
                                {skill.scriptFile && <span className="text-[10px] opacity-30">📜</span>}
                                {skill.requirementsFile && <span className="text-[10px] opacity-30">📦</span>}
                            </div>
                        </div>
                    </div>
                ))}
                {linkedSkills.length === 0 && !isAdding && (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-border/30 rounded-3xl opacity-40">
                        <p className="text-sm italic">This agent has no active skills.</p>
                        <button onClick={() => setIsAdding(true)} className="text-primary font-bold hover:underline mt-2">Add your first skill</button>
                    </div>
                )}
            </div>
        </div>
    );
};
