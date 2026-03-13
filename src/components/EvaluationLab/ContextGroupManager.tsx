"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ContextGroup, SystemPrompt, SystemPromptSet } from "@/types/agent";
import { useContextGroupForm } from "./ContextGroup/useContextGroupForm";
import { ContextGroupForm } from "./ContextGroup/ContextGroupForm";
import { ContextGroupCard } from "./ContextGroup/ContextGroupCard";

export const ContextGroupManager = ({
    initialGroups,
    prompts = [],
    promptSets = []
}: {
    initialGroups: ContextGroup[];
    prompts?: SystemPrompt[];
    promptSets?: SystemPromptSet[];
}) => {
    const router = useRouter();
    const {
        isEditing,
        editForm,
        handleSave,
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
    } = useContextGroupForm(() => router.refresh());

    const searchParams = useSearchParams();
    const urlSearch = searchParams.get("search") || "";
    const [localSearch, setLocalSearch] = useState<string | null>(null);
    const searchTerm = localSearch !== null ? localSearch : urlSearch;

    const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

    // Auto-expand categories if a search term is provided via URL
    useEffect(() => {
        if (urlSearch) {
            const matchedCategories = initialGroups
                .filter(group =>
                    group.name.toLowerCase().includes(urlSearch.toLowerCase()) ||
                    group.category?.toLowerCase().includes(urlSearch.toLowerCase())
                )
                .map(group => group.category || "Uncategorized");

            if (matchedCategories.length > 0) {
                requestAnimationFrame(() => {
                    setCollapsedCategories(prev => {
                        const next = { ...prev };
                        matchedCategories.forEach(cat => {
                            next[cat] = false; // false means NOT collapsed (expanded)
                        });
                        return next;
                    });
                });
            }
        }
    }, [urlSearch, initialGroups]);

    const toggleCategory = (category: string) => {
        setCollapsedCategories(prev => ({
            ...prev,
            [category]: !prev[category]
        }));
    };

    const toggleAllCategories = () => {
        const allCategories = Object.keys(groupsByCategory);
        const allCollapsed = allCategories.every(cat => collapsedCategories[cat]);

        if (allCollapsed) {
            // Expand all
            setCollapsedCategories({});
        } else {
            // Collapse all
            const newState: Record<string, boolean> = {};
            allCategories.forEach(cat => { newState[cat] = true; });
            setCollapsedCategories(newState);
        }
    };

    const filteredGroups = initialGroups.filter(group =>
        group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (group.description?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (group.category?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const groupsByCategory = filteredGroups.reduce((acc, group) => {
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h2 className="text-xl font-bold text-foreground/90 tracking-tight">Response Tests</h2>
                    <p className="text-xs text-foreground/40 font-medium uppercase tracking-wider">Configure and manage evaluation scenarios</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-foreground/20 group-focus-within:text-primary/50 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Filter tests..."
                            value={searchTerm}
                            onChange={(e) => setLocalSearch(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-background/50 border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all w-[240px]"
                        />
                    </div>
                    <button
                        onClick={toggleAllCategories}
                        className="p-2.5 bg-background/50 border border-border/50 rounded-xl hover:bg-foreground/5 transition-all text-sm group"
                        title="Toggle all categories"
                    >
                        <svg className="w-4 h-4 text-foreground/40 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <button
                        onClick={startNew}
                        className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all text-sm font-bold shadow-lg shadow-primary/20 flex items-center gap-2"
                    >
                        <span className="text-lg">+</span>
                        Create Test
                    </button>
                </div>
            </div>

            {isEditing !== null && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-background/40 backdrop-blur-md p-4 md:p-8 animate-in fade-in zoom-in-95 duration-200">
                    <div className="relative w-full max-w-5xl bg-card rounded-3xl border border-border shadow-2xl overflow-hidden my-auto">
                        <div className="max-h-[85vh] overflow-y-auto p-1">
                            <ContextGroupForm
                                form={editForm}
                                prompts={prompts}
                                promptSets={promptSets}
                                onFieldChange={onFieldChange}
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
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-10 py-4">
                {sortedCategories.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 glass rounded-3xl border border-dashed border-border/50">
                        <div className="w-16 h-16 bg-foreground/5 rounded-full flex items-center justify-center text-3xl">🔍</div>
                        <div>
                            <h3 className="text-lg font-bold text-foreground/60">No matching tests found</h3>
                            <p className="text-sm text-foreground/40">Try adjusting your search or category filters</p>
                        </div>
                    </div>
                )}
                {sortedCategories.map(([category, groups]) => {
                    const isCollapsed = collapsedCategories[category];
                    return (
                        <div key={category} className="space-y-6">
                            <button
                                onClick={() => toggleCategory(category)}
                                className="flex items-center gap-4 px-2 w-full group/cat"
                            >
                                <div className={`flex items-center justify-center w-6 h-6 rounded-lg bg-foreground/5 text-foreground/40 transition-transform duration-300 ${isCollapsed ? "-rotate-90" : ""}`}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-foreground/40 group-hover/cat:text-foreground/60 transition-colors">{category}</h3>
                                <div className="flex-1 h-[1px] bg-border/40" />
                                <span className="text-[10px] font-bold text-foreground/20 uppercase bg-foreground/5 px-2 py-1 rounded-md">{groups.length} Tests</span>
                            </button>

                            {!isCollapsed && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6 animate-in slide-in-from-top-2 fade-in duration-300">
                                    {groups.map(group => (
                                        <ContextGroupCard
                                            key={group.id}
                                            group={group}
                                            onEdit={startEdit}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
