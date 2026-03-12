import { useState } from "react";
import { ContextGroup } from "@/types/agent";
import { saveContextGroup } from "@/app/actions/benchmarks";
import { ContextGroupFormState, Expectation, Variation } from "./types";

export const useContextGroupForm = (onSuccess: () => void) => {
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<ContextGroupFormState>({
        name: "",
        description: "",
        category: "Technical",
        weight: 1,
        expectations: [],
        maxSentences: "",
        systemContext: "",
        promptTemplate: "",
        skillIds: [],
        systemPromptIds: [],
        systemPromptSetIds: [],
        systemPromptVariations: []
    });

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await saveContextGroup({
                ...editForm,
                id: isEditing || undefined,
                skillIds: JSON.stringify(editForm.skillIds),
                expectations: JSON.stringify(editForm.expectations),
                systemPromptIds: JSON.stringify(editForm.systemPromptIds),
                systemPromptSetIds: JSON.stringify(editForm.systemPromptSetIds),
                systemPromptVariations: JSON.stringify(editForm.systemPromptVariations),
                weight: Number(editForm.weight),
                maxSentences: editForm.maxSentences ? Number(editForm.maxSentences) : undefined,
            });
            onSuccess();
        } catch {
            alert("Failed to save context group.");
        }
    };

    const toggleSkill = (skillId: string) => {
        setEditForm(prev => ({
            ...prev,
            skillIds: prev.skillIds.includes(skillId)
                ? prev.skillIds.filter(id => id !== skillId)
                : [...prev.skillIds, skillId]
        }));
    };

    const startNew = () => {
        setIsEditing("");
        setEditForm({
            name: "",
            description: "",
            category: "Technical",
            weight: 1,
            expectations: [],
            maxSentences: "",
            systemContext: "",
            promptTemplate: "",
            skillIds: [],
            systemPromptIds: [],
            systemPromptSetIds: [],
            systemPromptVariations: []
        });
    };

    const startEdit = (group: ContextGroup) => {
        setIsEditing(group.id);
        const skillIds = group.skillIds ? JSON.parse(group.skillIds) : [];
        const expectations = group.expectations ? JSON.parse(group.expectations) : [];
        setEditForm({
            name: group.name,
            description: group.description || "",
            category: group.category || "Technical",
            weight: group.weight || 1,
            expectations: Array.isArray(expectations) ? expectations : [],
            maxSentences: group.maxSentences || "",
            systemContext: group.systemContext || "",
            promptTemplate: group.promptTemplate,
            skillIds: Array.isArray(skillIds) ? skillIds : [],
            systemPromptIds: group.systemPromptIds ? JSON.parse(group.systemPromptIds) || [] : [],
            systemPromptSetIds: group.systemPromptSetIds ? JSON.parse(group.systemPromptSetIds) || [] : [],
            systemPromptVariations: group.systemPromptVariations ? JSON.parse(group.systemPromptVariations) || [] : []
        });
    };

    const addExpectation = () => {
        setEditForm(prev => ({
            ...prev,
            expectations: [...prev.expectations, { type: "contains", value: "" }]
        }));
    };

    const removeExpectation = (index: number) => {
        setEditForm(prev => ({
            ...prev,
            expectations: prev.expectations.filter((_, i) => i !== index)
        }));
    };

    const updateExpectation = (index: number, field: keyof Expectation, value: string) => {
        setEditForm(prev => ({
            ...prev,
            expectations: prev.expectations.map((exp, i) =>
                i === index ? { ...exp, [field]: value } : exp
            )
        }));
    };

    const addVariation = () => {
        setEditForm(prev => ({
            ...prev,
            systemPromptVariations: [
                ...prev.systemPromptVariations,
                { id: crypto.randomUUID(), name: "", systemPrompt: "" }
            ]
        }));
    };

    const removeVariation = (id: string) => {
        setEditForm(prev => ({
            ...prev,
            systemPromptVariations: prev.systemPromptVariations.filter(v => v.id !== id)
        }));
    };

    const updateVariation = (id: string, field: keyof Variation, value: string) => {
        setEditForm(prev => ({
            ...prev,
            systemPromptVariations: prev.systemPromptVariations.map(v =>
                v.id === id ? { ...v, [field]: value } : v
            )
        }));
    };

    const addFromSet = (setId: string) => {
        if (editForm.systemPromptSetIds.includes(setId)) return;
        setEditForm(prev => ({
            ...prev,
            systemPromptSetIds: [...prev.systemPromptSetIds, setId]
        }));
    };

    const addFromLibrary = (promptId: string) => {
        if (editForm.systemPromptIds.includes(promptId)) return;
        setEditForm(prev => ({
            ...prev,
            systemPromptIds: [...prev.systemPromptIds, promptId]
        }));
    };

    const removeReference = (id: string, type: 'prompt' | 'set') => {
        setEditForm(prev => ({
            ...prev,
            systemPromptIds: type === 'prompt' ? prev.systemPromptIds.filter(i => i !== id) : prev.systemPromptIds,
            systemPromptSetIds: type === 'set' ? prev.systemPromptSetIds.filter(i => i !== id) : prev.systemPromptSetIds
        }));
    };

    const onFieldChange = (field: keyof ContextGroupFormState, value: string | number | string[] | Expectation[] | Variation[]) => {
        setEditForm(prev => ({ ...prev, [field]: value }));
    };

    const cancelEdit = () => setIsEditing(null);

    return {
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
    };
};
