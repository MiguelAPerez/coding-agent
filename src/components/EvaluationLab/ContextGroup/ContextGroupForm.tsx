import React from "react";
import { ContextGroupFormProps } from "./types";
import { ExpectationItem } from "./ExpectationItem";
import { VariationItem } from "./VariationItem";
import { ReferenceItem } from "./ReferenceItem";
import { SkillSelector } from "./SkillSelector";

export const ContextGroupForm = ({
    form,
    skills,
    prompts,
    promptSets,
    onFieldChange,
    onToggleSkill,
    onAddExpectation,
    onRemoveExpectation,
    onUpdateExpectation,
    onAddVariation,
    onRemoveVariation,
    onUpdateVariation,
    onAddFromSet,
    onAddFromLibrary,
    onRemoveReference,
    onSave,
    onCancel,
    isEditing
}: ContextGroupFormProps) => {
    return (
        <div className={`glass p-6 rounded-2xl border ${isEditing ? 'border-primary/30' : 'border-border'} animate-in fade-in slide-in-from-top-4 duration-300`}>
            <form onSubmit={onSave} className="space-y-4" aria-label="context-group-form">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label htmlFor="context-group-name" className="text-xs font-semibold uppercase text-foreground/40">Name</label>
                        <input
                            id="context-group-name"
                            className="w-full bg-background border border-border rounded-xl px-4 py-2"
                            value={form.name}
                            onChange={e => onFieldChange("name", e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-foreground/40">Category</label>
                        <input
                            className="w-full bg-background border border-border rounded-xl px-4 py-2"
                            value={form.category}
                            onChange={e => onFieldChange("category", e.target.value)}
                            placeholder="Technical, Reasoning, etc."
                        />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-foreground/40">Weight</label>
                        <input
                            type="number"
                            step="0.1"
                            className="w-full bg-background border border-border rounded-xl px-4 py-2"
                            value={form.weight}
                            onChange={e => onFieldChange("weight", Number(e.target.value))}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-foreground/40">Max Sentences</label>
                        <input
                            type="number"
                            className="w-full bg-background border border-border rounded-xl px-4 py-2"
                            value={form.maxSentences}
                            onChange={e => onFieldChange("maxSentences", e.target.value)}
                            placeholder="Optional"
                        />
                    </div>
                    <div className="space-y-2 col-span-1">
                        <label className="text-xs font-semibold uppercase text-foreground/40 text-transparent select-none">Spacer</label>
                        <div className="text-[10px] text-foreground/20 italic mt-2">Adjust scoring weights and constraints.</div>
                    </div>
                </div>

                <div className="space-y-2">
                    <label htmlFor="context-group-description" className="text-xs font-semibold uppercase text-foreground/40">Description</label>
                    <input
                        id="context-group-description"
                        className="w-full bg-background border border-border rounded-xl px-4 py-2"
                        value={form.description}
                        onChange={e => onFieldChange("description", e.target.value)}
                    />
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <label className="text-xs font-semibold uppercase text-foreground/40">Evaluation Expectations</label>
                        <button
                            type="button"
                            onClick={onAddExpectation}
                            className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20 transition-all font-bold uppercase"
                        >
                            + Add Expectation
                        </button>
                    </div>
                    <div className="space-y-2">
                        {form.expectations.map((exp, idx) => (
                            <ExpectationItem
                                key={idx}
                                index={idx}
                                expectation={exp}
                                onUpdate={onUpdateExpectation}
                                onRemove={onRemoveExpectation}
                            />
                        ))}
                        {form.expectations.length === 0 && (
                            <div className="text-center py-4 border-2 border-dashed border-border/20 rounded-xl text-[10px] text-foreground/20 italic">
                                No expectations defined. Add one to enable automated scoring.
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase text-foreground/40">Base System Context (Default Persona)</label>
                    <textarea
                        className="w-full bg-background border border-border rounded-xl px-4 py-2 min-h-[60px]"
                        value={form.systemContext}
                        onChange={e => onFieldChange("systemContext", e.target.value)}
                        placeholder="Optional: Base level instructions used if no variations match..."
                    />
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <label className="text-xs font-semibold uppercase text-foreground/40">System Prompt Variations</label>
                        <div className="flex gap-2">
                            {promptSets.length > 0 && (
                                <select
                                    className="text-[10px] bg-purple-500/10 text-purple-600 px-2 py-1 rounded hover:bg-purple-500/20 transition-all font-bold uppercase border-none outline-none appearance-none cursor-pointer"
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            onAddFromSet(e.target.value);
                                            e.target.value = "";
                                        }
                                    }}
                                    defaultValue=""
                                >
                                    <option value="" disabled>+ From Set</option>
                                    {promptSets.map(set => (
                                        <option key={set.id} value={set.id}>{set.name}</option>
                                    ))}
                                </select>
                            )}
                            {prompts.length > 0 && (
                                <select
                                    className="text-[10px] bg-purple-500/10 text-purple-600 px-2 py-1 rounded hover:bg-purple-500/20 transition-all font-bold uppercase border-none outline-none appearance-none cursor-pointer"
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            onAddFromLibrary(e.target.value);
                                            e.target.value = "";
                                        }
                                    }}
                                    defaultValue=""
                                >
                                    <option value="" disabled>+ From Library</option>
                                    {prompts.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            )}
                            <button
                                type="button"
                                onClick={onAddVariation}
                                className="text-[10px] bg-purple-500/10 text-purple-600 px-2 py-1 rounded hover:bg-purple-500/20 transition-all font-bold uppercase"
                            >
                                + Manual
                            </button>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {form.systemPromptSetIds.map(setId => (
                            <ReferenceItem
                                key={setId}
                                id={setId}
                                type="set"
                                promptSets={promptSets}
                                prompts={prompts}
                                onRemove={onRemoveReference}
                            />
                        ))}
                        {form.systemPromptIds.map(promptId => (
                            <ReferenceItem
                                key={promptId}
                                id={promptId}
                                type="prompt"
                                promptSets={promptSets}
                                prompts={prompts}
                                onRemove={onRemoveReference}
                            />
                        ))}
                        {form.systemPromptVariations.map((v) => (
                            <VariationItem
                                key={v.id}
                                variation={v}
                                onUpdate={onUpdateVariation}
                                onRemove={onRemoveVariation}
                            />
                        ))}

                        {form.systemPromptVariations.length === 0 &&
                            form.systemPromptIds.length === 0 &&
                            form.systemPromptSetIds.length === 0 && (
                                <div className="text-center py-4 border-2 border-dashed border-border/20 rounded-xl text-[10px] text-foreground/20 italic">
                                    No variations defined. Uses base system context by default.
                                </div>
                            )}
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase text-foreground/40">Prompt Template</label>
                    <textarea
                        className="w-full bg-background border border-border rounded-xl px-4 py-2 min-h-[100px]"
                        value={form.promptTemplate}
                        onChange={e => onFieldChange("promptTemplate", e.target.value)}
                        placeholder="Instructions for this context group..."
                        required
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase text-foreground/40">Included Skills</label>
                    <SkillSelector
                        skills={skills}
                        selectedSkillIds={form.skillIds}
                        onToggle={onToggleSkill}
                    />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 text-sm text-foreground/60 hover:text-foreground"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="px-6 py-2 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-all font-mono"
                    >
                        SAVE_CONFIG
                    </button>
                </div>
            </form>
        </div>
    );
};
