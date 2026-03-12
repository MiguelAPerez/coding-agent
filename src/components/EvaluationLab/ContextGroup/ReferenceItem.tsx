import React from "react";
import { SystemPrompt, SystemPromptSet } from "@/types/agent";

interface ReferenceItemProps {
    id: string;
    type: 'prompt' | 'set';
    prompts: SystemPrompt[];
    promptSets: SystemPromptSet[];
    onRemove: (id: string, type: 'prompt' | 'set') => void;
}

export const ReferenceItem = ({ id, type, prompts, promptSets, onRemove }: ReferenceItemProps) => {
    if (type === 'set') {
        const set = promptSets.find(s => s.id === id);
        return (
            <div className="flex justify-between items-center p-3 bg-purple-500/5 rounded-xl border border-purple-500/20 animate-in fade-in slide-in-from-left-2 duration-200">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-500">📚</div>
                    <div>
                        <div className="text-xs font-bold text-purple-600">{set?.name || 'Unknown Set'}</div>
                        <div className="text-[10px] text-foreground/40 italic">System Prompt Set Reference</div>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => onRemove(id, 'set')}
                    className="p-1 text-foreground/20 hover:text-destructive transition-colors"
                >
                    <span className="text-lg">×</span>
                </button>
            </div>
        );
    }

    const p = prompts.find(pr => pr.id === id);
    return (
        <div className="flex justify-between items-center p-3 bg-blue-500/5 rounded-xl border border-blue-500/20 animate-in fade-in slide-in-from-left-2 duration-200">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-500">👤</div>
                <div>
                    <div className="text-xs font-bold text-blue-600">{p?.name || 'Unknown Prompt'}</div>
                    <div className="text-[10px] text-foreground/40 italic">System Prompt Reference</div>
                </div>
            </div>
            <button
                type="button"
                onClick={() => onRemove(id, 'prompt')}
                className="p-1 text-foreground/20 hover:text-destructive transition-colors"
            >
                <span className="text-lg">×</span>
            </button>
        </div>
    );
};
