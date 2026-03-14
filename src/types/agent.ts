export interface AgentConfig {
    id: string;
    userId: string;
    name: string;
    provider: string;
    model: string;

    systemPromptId: string | null;
    systemPrompt: string;
    temperature: number;
    updatedAt: Date;
    isManaged: boolean;
}

export interface Skill {
    id: string;
    userId: string;
    agentId: string | null;
    name: string;
    description: string;
    content: string;
    isEnabled: boolean;
    updatedAt: Date;
}

export interface Tool {
    id: string;
    userId: string;
    agentId: string | null;
    name: string;
    description: string;
    schema: string;
    isEnabled: boolean;
    updatedAt: Date;
}

export interface ContextGroup {
    id: string;
    userId: string;
    name: string;
    description: string | null;
    category: string | null;
    expectations: string | null; // stringified JSON
    weight: number | null;
    maxSentences: number | null;
    systemContext: string | null;
    promptTemplate: string;
    toolIds: string | null;  // stringified JSON
    systemPromptIds: string | null; // stringified JSON array
    systemPromptSetIds: string | null; // stringified JSON array
    systemPromptVariations?: string | null; // JSON string
    updatedAt: Date;
}

export interface SystemPrompt {
    id: string;
    userId: string;
    name: string;
    content: string;
    updatedAt: Date;
    isManaged: boolean;
}

export interface SystemPromptSet {
    id: string;
    userId: string;
    name: string;
    description: string | null;
    systemPromptIds: string; // JSON string array
    updatedAt: Date;
}

export interface BenchmarkRun {
    id: string;
    userId: string;
    name: string;
    description: string | null;
    models: string; // JSON string
    contextGroupIds: string; // JSON string
    systemPromptIds: string | null; // JSON string array
    systemPromptSetIds: string | null; // JSON string array
    parallelWorkers?: number;
    updatedAt: Date;
}

export interface Benchmark {
    id: string;
    userId: string;
    runId: string | null;
    name: string;
    status: "idle" | "running" | "completed" | "failed" | "cancelled";
    startedAt?: Date | null;
    completedAt?: Date | null;
    parallelWorkers?: number;
    totalEntries: number;
    completedEntries: number;
}

export interface BenchmarkEntry {
    id: string;
    benchmarkId: string;
    model: string;
    contextGroupId: string;
    systemPromptId: string | null;
    category: string | null;
    score: number | null;
    metrics: string | null; // JSON string
    prompt: string | null;
    systemContext: string | null;
    status: "pending" | "preparing" | "running" | "completed" | "failed" | "cancelled";
    output: string | null;
    error: string | null;
    duration: number | null;
    startedAt: Date | null;
    completedAt: Date | null;
}

