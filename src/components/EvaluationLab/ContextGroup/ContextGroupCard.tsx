import React from "react";
import { ContextGroup } from "@/types/agent";
import { deleteContextGroup } from "@/app/actions/benchmarks";

interface ContextGroupCardProps {
    group: ContextGroup;
    onEdit: (group: ContextGroup) => void;
}

export const ContextGroupCard = ({ group, onEdit }: ContextGroupCardProps) => {
    return (
        <div className="glass p-5 rounded-2xl border border-border/50 hover:border-primary/30 transition-all group">
            <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-foreground/80">{group.name}</h3>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(group)} className="p-1 hover:text-primary"><span className="text-xs">Edit</span></button>
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
                {(() => {
                    let count = 0;
                    try {
                        const parsed = group.expectations ? JSON.parse(group.expectations) : [];
                        count = Array.isArray(parsed) ? parsed.length : 0;
                    } catch { /* ignore */ }
                    
                    if (count === 0) return null;
                    return (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-600 font-bold px-2 py-0.5 rounded-md uppercase">
                            {count} Expectations
                        </span>
                    );
                })()}
                {(() => {
                    let variationsCount = 0;
                    try {
                        const variations = group.systemPromptVariations ? JSON.parse(group.systemPromptVariations) : [];
                        variationsCount = Array.isArray(variations) ? variations.length : 0;
                    } catch { /* ignore */ }
                    
                    if (variationsCount === 0) return null;
                    return (
                        <span className="text-[10px] bg-amber-500/10 text-amber-600 font-bold px-2 py-0.5 rounded-md uppercase">
                            {variationsCount} Manuals
                        </span>
                    );
                })()}
                {(() => {
                    let referenceCount = 0;
                    try {
                        const pIds = group.systemPromptIds ? JSON.parse(group.systemPromptIds) : [];
                        const sIds = group.systemPromptSetIds ? JSON.parse(group.systemPromptSetIds) : [];
                        referenceCount = (Array.isArray(pIds) ? pIds.length : 0) + (Array.isArray(sIds) ? sIds.length : 0);
                    } catch { /* ignore */ }

                    if (referenceCount === 0) return null;
                    return (
                        <span className="text-[10px] bg-purple-500/10 text-purple-600 font-bold px-2 py-0.5 rounded-md uppercase">
                            {referenceCount} References
                        </span>
                    );
                })()}
            </div>
            <div className="flex flex-wrap gap-2">
                <span className="text-[10px] bg-foreground/5 text-foreground/40 px-2 py-0.5 rounded-full border border-border">
                    {(group.promptTemplate || "").length} chars
                </span>
                <span className="text-[10px] bg-foreground/5 text-foreground/40 px-2 py-0.5 rounded-full border border-border">
                    ~{Math.ceil((group.promptTemplate || "").length / 4)} tokens
                </span>
            </div>
        </div>
    );
};
