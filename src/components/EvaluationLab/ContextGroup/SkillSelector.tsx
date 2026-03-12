import React from "react";
import { Skill } from "@/types/agent";

interface SkillSelectorProps {
    skills: Skill[];
    selectedSkillIds: string[];
    onToggle: (skillId: string) => void;
}

export const SkillSelector = ({ skills, selectedSkillIds, onToggle }: SkillSelectorProps) => {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {skills.map(skill => (
                <div
                    key={skill.id}
                    onClick={() => onToggle(skill.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${selectedSkillIds.includes(skill.id)
                        ? "bg-primary/10 border-primary/40 text-primary"
                        : "bg-background/40 border-border hover:border-foreground/20"
                        }`}
                >
                    <div className={`w-3 h-3 rounded-full border ${selectedSkillIds.includes(skill.id) ? "bg-primary border-primary" : "border-border"
                        }`} />
                    <span className="text-xs truncate">{skill.name}</span>
                </div>
            ))}
        </div>
    );
};
