"use client";

import React from "react";
import { ContextGroup, Skill, SystemPrompt, SystemPromptSet } from "@/types/agent";
import { useContextGroupForm } from "./ContextGroup/useContextGroupForm";
import { ContextGroupForm } from "./ContextGroup/ContextGroupForm";
import { ContextGroupCard } from "./ContextGroup/ContextGroupCard";

export const ContextGroupManager = ({
    initialGroups,
    skills,
    prompts = [],
    promptSets = []
}: {
    initialGroups: ContextGroup[];
    skills: Skill[];
    prompts?: SystemPrompt[];
    promptSets?: SystemPromptSet[];
}) => {
    const {
        isEditing,
        editForm,
        handleSave,
        toggleSkill,
        startNew,
        startEdit,
        addExpectation,
        removeExpectation,
        updateExpectation,
        addVariation,
        removeVariation,
        updateVariation,
        addFromSet,
        addFromLibrary,
        removeReference,
        onFieldChange,
        cancelEdit
    } = useContextGroupForm(() => window.location.reload());

    const groupsByCategory = initialGroups.reduce((acc, group) => {
        const cat = group.category || "Uncategorized";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(group);
        return acc;
    }, {} as Record<string, ContextGroup[]>);

    const sortedCategories = Object.entries(groupsByCategory).sort(([a], [b]) => 
        a.localeCompare(b)
    );

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
                <ContextGroupForm
                    form={editForm}
                    skills={skills}
                    prompts={prompts}
                    promptSets={promptSets}
                    onFieldChange={onFieldChange}
                    onToggleSkill={toggleSkill}
                    onAddExpectation={addExpectation}
                    onRemoveExpectation={removeExpectation}
                    onUpdateExpectation={updateExpectation}
                    onAddVariation={addVariation}
                    onRemoveVariation={removeVariation}
                    onUpdateVariation={updateVariation}
                    onAddFromSet={addFromSet}
                    onAddFromLibrary={addFromLibrary}
                    onRemoveReference={removeReference}
                    onSave={handleSave}
                    onCancel={cancelEdit}
                    isEditing={isEditing !== ""}
                />
            )}

            <div className="space-y-10">
                {sortedCategories.map(([category, groups]) => (
                    <div key={category} className="space-y-4">
                        <div className="flex items-center gap-4 px-2">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/40">{category}</h3>
                            <div className="flex-1 h-[1px] bg-border/40" />
                            <span className="text-[10px] font-bold text-foreground/20 uppercase">{groups.length} Prompts</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {groups.map(group => (
                                <ContextGroupCard 
                                    key={group.id} 
                                    group={group} 
                                    onEdit={startEdit} 
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
