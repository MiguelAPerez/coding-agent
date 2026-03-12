import { SystemPrompt, SystemPromptSet } from "@/types/agent";

export interface Expectation {
    type: string;
    value: string;
}

export interface Variation {
    id: string;
    name: string;
    systemPrompt: string;
}

export interface ContextGroupFormState {
    name: string;
    description: string;
    category: string;
    weight: number;
    expectations: Expectation[];
    maxSentences: string | number;
    systemContext: string;
    promptTemplate: string;
    systemPromptIds: string[];
    systemPromptSetIds: string[];
    systemPromptVariations: Variation[];
}

export interface ContextGroupFormProps {
    form: ContextGroupFormState;
    prompts: SystemPrompt[];
    promptSets: SystemPromptSet[];
    onFieldChange: (field: keyof ContextGroupFormState, value: string | number | string[] | Expectation[] | Variation[]) => void;
    onAddExpectation: () => void;
    onRemoveExpectation: (index: number) => void;
    onUpdateExpectation: (index: number, field: keyof Expectation, value: string) => void;
    onAddVariation: () => void;
    onRemoveVariation: (id: string) => void;
    onUpdateVariation: (id: string, field: keyof Variation, value: string) => void;
    onAddFromSet: (setId: string) => void;
    onAddFromLibrary: (promptId: string) => void;
    onRemoveReference: (id: string, type: 'prompt' | 'set') => void;
    onSave: (e: React.FormEvent) => void;
    onCancel: () => void;
    isEditing: boolean;
}
