export interface AgentConfig {
    id: string;
    userId: string;
    model: string;
    systemPrompt: string;
    temperature: number;
    updatedAt: Date;
}

export interface Skill {
    id: string;
    userId: string;
    name: string;
    description: string;
    content: string;
    isEnabled: boolean;
    updatedAt: Date;
}

export interface Tool {
    id: string;
    userId: string;
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
    expectedKeywords: string | null; // stringified JSON
    weight: number | null;
    maxSentences: number | null;
    systemContext: string | null;
    promptTemplate: string;
    skillIds: string | null; // stringified JSON
    toolIds: string | null;  // stringified JSON
    updatedAt: Date;
}

export interface BenchmarkRun {
    id: string;
    userId: string;
    name: string;
    description: string | null;
    models: string; // JSON string
    contextGroupIds: string; // JSON string
    updatedAt: Date;
}

export interface Benchmark {
    id: string;
    userId: string;
    runId: string | null;
    name: string;
    status: "idle" | "running" | "completed" | "failed";
    startedAt: Date | null;
    completedAt: Date | null;
    totalEntries: number;
    completedEntries: number;
}

export interface BenchmarkEntry {
    id: string;
    benchmarkId: string;
    model: string;
    contextGroupId: string;
    category: string | null;
    score: number | null;
    metrics: string | null; // JSON string
    prompt: string | null;
    systemContext: string | null;
    status: "pending" | "running" | "completed" | "failed";
    output: string | null;
    error: string | null;
    duration: number | null;
    startedAt: Date | null;
    completedAt: Date | null;
}

