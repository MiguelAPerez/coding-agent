"use client";

import React from "react";
import { Skill } from "@/types/agent";
import { formatDistanceToNow } from "date-fns";

interface SkillCardProps {
    skill: Skill;
    onEdit: (skill: Skill) => void;
    onDelete: (id: string) => void;
}

export const SkillCard: React.FC<SkillCardProps> = ({ skill, onEdit, onDelete }) => {
    return (
        <div className="glass p-4 rounded-2xl border border-border/50 hover:border-primary/30 transition-all group relative overflow-hidden">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h4 className="font-bold text-sm text-foreground/80 flex items-center gap-2">
                        {skill.name}
                        {skill.isManaged && (
                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase font-black tracking-tighter">System</span>
                        )}
                        <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-black tracking-tighter ${
                            skill.runtime === 'docker' ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'
                        }`}>
                            {skill.runtime}
                        </span>
                    </h4>
                    <p className="text-xs text-foreground/40 line-clamp-2 mt-1">{skill.description}</p>
                </div>
                {!skill.isManaged && (
                    <button
                        onClick={() => onDelete(skill.id)}
                        className="text-foreground/20 hover:text-destructive transition-colors"
                    >
                        <i className="ri-delete-bin-line text-sm"></i>
                    </button>
                )}
            </div>
            
            <div className="flex items-center justify-between mt-4">
                <span className="text-[10px] text-foreground/20 font-medium">
                    {formatDistanceToNow(new Date(skill.updatedAt))} ago
                </span>
                <button
                    onClick={() => onEdit(skill)}
                    className="text-[10px] font-bold text-primary hover:underline"
                >
                    {skill.isManaged ? "View Skill →" : "Edit Skill →"}
                </button>
            </div>
        </div>
    );
};
