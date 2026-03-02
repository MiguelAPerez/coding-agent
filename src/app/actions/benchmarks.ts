"use server";

import { db } from "@/../db";
import { contextGroups, benchmarkRuns, benchmarks, benchmarkEntries, systemPrompts, systemPromptSets } from "@/../db/schema";
import { eq, desc, and, or, inArray } from "drizzle-orm";
import { getOllamaConfig } from "./ollama";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { revalidatePath } from "next/cache";

export async function getContextGroups() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return [];

    return db.select().from(contextGroups).where(eq(contextGroups.userId, session.user.id)).all();
}

export async function saveContextGroup(data: {
    id?: string;
    name: string;
    description?: string;
    category?: string;
    weight?: number;
    expectations?: string;
    maxSentences?: number;
    systemContext?: string;
    promptTemplate: string;
    skillIds?: string;
    toolIds?: string;
    systemPromptIds?: string;
    systemPromptSetIds?: string;
    systemPromptVariations?: string;
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const now = new Date();
    const values = {
        name: data.name,
        description: data.description,
        category: data.category,
        weight: data.weight,
        expectations: data.expectations,
        maxSentences: data.maxSentences,
        systemContext: data.systemContext,
        promptTemplate: data.promptTemplate,
        skillIds: data.skillIds,
        toolIds: data.toolIds,
        systemPromptIds: data.systemPromptIds,
        systemPromptSetIds: data.systemPromptSetIds,
        systemPromptVariations: data.systemPromptVariations,
        updatedAt: now,
    };

    if (data.id) {
        db.update(contextGroups)
            .set(values)
            .where(eq(contextGroups.id, data.id))
            .run();
    } else {
        db.insert(contextGroups)
            .values({
                userId: session.user.id,
                ...values,
            })
            .run();
    }

    revalidatePath("/evaluation-lab");
}

export async function deleteContextGroup(id: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    db.delete(contextGroups).where(eq(contextGroups.id, id)).run();
    revalidatePath("/evaluation-lab");
}

export async function getBenchmarkRuns() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return [];

    return db.select().from(benchmarkRuns).where(eq(benchmarkRuns.userId, session.user.id)).all();
}

export async function saveBenchmarkRun(data: {
    id?: string;
    name: string;
    models: string[];
    contextGroupIds: string[];
    systemPromptIds?: string[];
    systemPromptSetIds?: string[];
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const now = new Date();
    const values = {
        name: data.name,
        models: JSON.stringify(data.models),
        contextGroupIds: JSON.stringify(data.contextGroupIds),
        systemPromptIds: data.systemPromptIds ? JSON.stringify(data.systemPromptIds) : null,
        systemPromptSetIds: data.systemPromptSetIds ? JSON.stringify(data.systemPromptSetIds) : null,
        updatedAt: now,
    };

    if (data.id) {
        db.update(benchmarkRuns)
            .set(values)
            .where(eq(benchmarkRuns.id, data.id))
            .run();
    } else {
        db.insert(benchmarkRuns)
            .values({
                userId: session.user.id,
                ...values,
            })
            .run();
    }

    revalidatePath("/evaluation-lab");
}

export async function deleteBenchmarkRun(id: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    db.delete(benchmarkRuns).where(eq(benchmarkRuns.id, id)).run();
    revalidatePath("/evaluation-lab");
}

export async function triggerBenchmark(runId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const run = db.select().from(benchmarkRuns).where(eq(benchmarkRuns.id, runId)).get();
    if (!run) throw new Error("Run definition not found");

    const models = JSON.parse(run.models) as string[];
    const contextGroupIds = JSON.parse(run.contextGroupIds) as string[];
    const systemPromptIds = run.systemPromptIds ? JSON.parse(run.systemPromptIds) as string[] : [];
    const systemPromptSetIds = run.systemPromptSetIds ? JSON.parse(run.systemPromptSetIds) as string[] : [];

    const cgs = db.select().from(contextGroups).where(inArray(contextGroups.id, contextGroupIds)).all();
    const cgMap = new Map(cgs.map(cg => [cg.id, cg]));

    // eslint-disable-next-line prefer-const
    let resolvedSystemPromptIds = new Set<string>(systemPromptIds);
    if (systemPromptSetIds.length > 0) {
        const sets = db.select().from(systemPromptSets).where(inArray(systemPromptSets.id, systemPromptSetIds)).all();
        sets.forEach(set => {
            try {
                const ids = JSON.parse(set.systemPromptIds) as string[];
                ids.forEach(id => resolvedSystemPromptIds.add(id));
            } catch { }
        });
    }

    const resolvedSystemPromptsList = Array.from(resolvedSystemPromptIds);
    const systemPromptsData = resolvedSystemPromptsList.length > 0
        ? db.select().from(systemPrompts).where(inArray(systemPrompts.id, resolvedSystemPromptsList)).all()
        : [];
    const spMap = new Map(systemPromptsData.map(sp => [sp.id, sp]));

    let totalEntries = 0;
    for (const model of models) {
        for (const cgId of contextGroupIds) {
            const cg = cgMap.get(cgId);
            if (!cg) continue;

            if (resolvedSystemPromptsList.length > 0) {
                totalEntries += resolvedSystemPromptsList.length;
            } else {
                let legacyVariationsCount = 0;
                if (cg.systemPromptVariations) {
                    try {
                        const variations = JSON.parse(cg.systemPromptVariations);
                        legacyVariationsCount = Array.isArray(variations) ? variations.length : 0;
                    } catch { }
                }
                totalEntries += Math.max(1, legacyVariationsCount);
            }
        }
    }

    const benchmarkId = crypto.randomUUID();
    const now = new Date();

    db.insert(benchmarks)
        .values({
            id: benchmarkId,
            userId: session.user.id,
            runId: runId,
            name: run.name,
            status: "running",
            startedAt: now,
            totalEntries: totalEntries,
            completedEntries: 0,
        })
        .run();

    for (const model of models) {
        for (const cgId of contextGroupIds) {
            const cg = cgMap.get(cgId);
            if (!cg) continue;

            // 1. Resolve variations for this specific Context Group
            const cgSystemPromptIds = new Set<string>();
            if (cg.systemPromptIds) {
                try {
                    const ids = JSON.parse(cg.systemPromptIds) as string[];
                    ids.forEach(id => cgSystemPromptIds.add(id));
                } catch { }
            }
            if (cg.systemPromptSetIds) {
                try {
                    const setIds = JSON.parse(cg.systemPromptSetIds) as string[];
                    const setsForCg = db.select().from(systemPromptSets).where(inArray(systemPromptSets.id, setIds)).all();
                    setsForCg.forEach(set => {
                        try {
                            const ids = JSON.parse(set.systemPromptIds) as string[];
                            ids.forEach(id => cgSystemPromptIds.add(id));
                        } catch { }
                    });
                } catch { }
            }

            const cgVariationsList = Array.from(cgSystemPromptIds);

            // 2. Logic: If CG has referenced prompts OR manual variations, use them.
            // Otherwise, use the RUN-level prompts.

            if (cgVariationsList.length > 0) {
                for (const spId of cgVariationsList) {
                    const sp = spMap.get(spId) || db.select().from(systemPrompts).where(eq(systemPrompts.id, spId)).get();
                    db.insert(benchmarkEntries)
                        .values({
                            benchmarkId: benchmarkId,
                            model: model,
                            contextGroupId: cgId,
                            systemPromptId: spId,
                            status: "pending",
                            metrics: JSON.stringify({ variationName: sp?.name || "System Prompt" })
                        })
                        .run();
                }
            } else {
                let manualVariations: { id: string; name: string; systemPrompt: string }[] = [];
                if (cg.systemPromptVariations) {
                    try {
                        manualVariations = JSON.parse(cg.systemPromptVariations);
                    } catch { }
                }

                if (manualVariations.length > 0) {
                    for (const variation of manualVariations) {
                        db.insert(benchmarkEntries)
                            .values({
                                benchmarkId: benchmarkId,
                                model: model,
                                contextGroupId: cgId,
                                status: "pending",
                                metrics: JSON.stringify({ variation })
                            })
                            .run();
                    }
                } else {
                    // Fallback to RUN prompts
                    if (resolvedSystemPromptsList.length > 0) {
                        for (const spId of resolvedSystemPromptsList) {
                            const sp = spMap.get(spId);
                            db.insert(benchmarkEntries)
                                .values({
                                    benchmarkId: benchmarkId,
                                    model: model,
                                    contextGroupId: cgId,
                                    systemPromptId: spId,
                                    status: "pending",
                                    metrics: JSON.stringify({ variationName: sp?.name || "System Prompt" })
                                })
                                .run();
                        }
                    } else {
                        db.insert(benchmarkEntries)
                            .values({
                                benchmarkId: benchmarkId,
                                model: model,
                                contextGroupId: cgId,
                                status: "pending",
                            })
                            .run();
                    }
                }
            }
        }
    }

    revalidatePath("/evaluation-lab");
    return benchmarkId;
}

export async function runBenchmark(name: string, models: string[], contextGroupIds: string[]) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const benchmarkId = crypto.randomUUID();
    const now = new Date();

    db.insert(benchmarks)
        .values({
            id: benchmarkId,
            userId: session.user.id,
            name: name,
            status: "running",
            startedAt: now,
            totalEntries: models.length * contextGroupIds.length,
            completedEntries: 0,
        })
        .run();

    for (const model of models) {
        for (const cgId of contextGroupIds) {
            db.insert(benchmarkEntries)
                .values({
                    benchmarkId: benchmarkId,
                    model: model,
                    contextGroupId: cgId,
                    status: "pending",
                })
                .run();
        }
    }

    revalidatePath("/evaluation-lab");
    return benchmarkId;
}

export async function getBenchmarkProgress(benchmarkId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const benchmark = db.select().from(benchmarks).where(eq(benchmarks.id, benchmarkId)).get();
    if (!benchmark) return null;

    const entries = db.select().from(benchmarkEntries).where(eq(benchmarkEntries.benchmarkId, benchmarkId)).all();

    return {
        ...benchmark,
        entries: entries
    };
}

export async function getLatestBenchmark() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return null;

    return db.select()
        .from(benchmarks)
        .where(eq(benchmarks.userId, session.user.id))
        .orderBy(desc(benchmarks.startedAt))
        .get();
}

export async function cancelBenchmark(benchmarkId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    db.update(benchmarks)
        .set({ status: "cancelled", completedAt: new Date() })
        .where(eq(benchmarks.id, benchmarkId))
        .run();

    db.update(benchmarkEntries)
        .set({ status: "cancelled" })
        .where(
            and(
                eq(benchmarkEntries.benchmarkId, benchmarkId),
                or(
                    eq(benchmarkEntries.status, "pending"),
                    eq(benchmarkEntries.status, "preparing"),
                    eq(benchmarkEntries.status, "running")
                )
            )
        )
        .run();

    revalidatePath("/evaluation-lab");
}

export async function simulateBenchmarkStep(benchmarkId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const benchmark = db.select().from(benchmarks).where(eq(benchmarks.id, benchmarkId)).get();
    if (!benchmark || benchmark.status !== "running") {
        return { finished: true };
    }

    const allEntries = db.select()
        .from(benchmarkEntries)
        .where(eq(benchmarkEntries.benchmarkId, benchmarkId))
        .all();

    const nextPreparingEntry = allEntries.find(e => e.status === "preparing");

    if (nextPreparingEntry) {
        const cg = db.select().from(contextGroups).where(eq(contextGroups.id, nextPreparingEntry.contextGroupId)).get();

        if (!cg) throw new Error("Context group not found");

        const expectations = cg.expectations ? JSON.parse(cg.expectations) : [];
        const prompt = cg.promptTemplate;
        const category = cg.category || "Uncategorized";

        let systemContext = cg.systemContext || "";
        let variationName = null;

        if (nextPreparingEntry.systemPromptId) {
            const sp = db.select().from(systemPrompts).where(eq(systemPrompts.id, nextPreparingEntry.systemPromptId)).get();
            if (sp) {
                systemContext = sp.content;
                variationName = sp.name;
            }
        } else if (nextPreparingEntry.metrics) {
            try {
                const pending = JSON.parse(nextPreparingEntry.metrics);
                if (pending.variation) {
                    systemContext = pending.variation.systemPrompt;
                    variationName = pending.variation.name;
                }
            } catch { }
        }

        const startedAt = new Date();
        db.update(benchmarkEntries)
            .set({ status: "running", startedAt, category, prompt })
            .where(eq(benchmarkEntries.id, nextPreparingEntry.id))
            .run();

        let output = "";
        let duration = 0;

        try {
            const ollamaConfig = await getOllamaConfig();
            if (!ollamaConfig) {
                throw new Error("Ollama is not configured.");
            }

            const requestBody = {
                model: nextPreparingEntry.model,
                prompt: prompt,
                system: systemContext,
                stream: false,
                keep_alive: 0
            };

            const startTime = Date.now();
            const response = await fetch(`${ollamaConfig.url}/api/generate`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestBody),
                cache: "no-store",
                signal: AbortSignal.timeout(120000),
            });

            duration = Date.now() - startTime;

            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.statusText}`);
            }

            const data = await response.json();
            output = data.response || "";

        } catch (error) {
            output = `Error during generation: ${error instanceof Error ? error.message : "Unknown error"}`;
            duration = duration || 1000;
        }

        const completedAt = new Date(startedAt.getTime() + duration);

        let totalScore = 0;
        const matchDetails = expectations.map((exp: { type: string; value: string }) => {
            let found = false;
            switch (exp.type) {
                case "contains":
                    found = output.toLowerCase().includes(exp.value.toLowerCase());
                    break;
                case "not_contains":
                    found = !output.toLowerCase().includes(exp.value.toLowerCase());
                    break;
                case "regex":
                    try {
                        const match = exp.value.match(/^\/(.*)\/([gimuy]*)$/);
                        const regex = match ? new RegExp(match[1], match[2]) : new RegExp(exp.value, "i");
                        found = regex.test(output);
                    } catch {
                        found = false;
                    }
                    break;
                case "exact":
                    found = output.trim().toLowerCase() === exp.value.trim().toLowerCase();
                    break;
            }
            if (found && expectations.length > 0) totalScore += (100 / expectations.length);
            return { ...exp, found };
        });

        const isError = output.startsWith("Error during generation");
        let score = isError ? 0 : Math.round(totalScore);

        if (cg.maxSentences && cg.maxSentences > 0) {
            const sentenceCount = output.split(/[.!?]+\s/).filter(s => s.trim().length > 0).length;
            if (sentenceCount > cg.maxSentences) score *= 0.5;
        }

        db.update(benchmarkEntries)
            .set({
                status: "completed",
                completedAt,
                duration,
                output,
                category,
                score: Math.round(score),
                prompt,
                systemContext,
                metrics: JSON.stringify({
                    expectationResults: matchDetails,
                    modelName: nextPreparingEntry.model,
                    throughput: duration > 0 ? Math.round(output.length / (duration / 1000)) : 0,
                    responseSize: output.length,
                    responseSizeBytes: output.length,
                    error: isError,
                    variationName
                })
            })
            .where(eq(benchmarkEntries.id, nextPreparingEntry.id))
            .run();

        const bench = db.select().from(benchmarks).where(eq(benchmarks.id, benchmarkId)).get();
        if (bench) {
            db.update(benchmarks)
                .set({ completedEntries: bench.completedEntries + 1 })
                .where(eq(benchmarks.id, benchmarkId))
                .run();
        }

        revalidatePath("/evaluation-lab");
        return { finished: false };
    }

    const nextPendingEntry = allEntries.find(e => e.status === "pending");

    if (!nextPendingEntry) {
        db.update(benchmarks)
            .set({ status: "completed", completedAt: new Date() })
            .where(eq(benchmarks.id, benchmarkId))
            .run();
        return { finished: true };
    }

    const cgPrep = db.select().from(contextGroups).where(eq(contextGroups.id, nextPendingEntry.contextGroupId)).get();

    db.update(benchmarkEntries)
        .set({ status: "preparing", category: cgPrep?.category || "Uncategorized" })
        .where(eq(benchmarkEntries.id, nextPendingEntry.id))
        .run();

    revalidatePath("/evaluation-lab");
    return { finished: false };
}

export async function getCompletedBenchmarks() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return [];

    const completedBenchmarks = db.select()
        .from(benchmarks)
        .where(
            and(
                eq(benchmarks.userId, session.user.id),
                eq(benchmarks.status, "completed")
            )
        )
        .all();

    return completedBenchmarks.map(b => {
        const entries = db.select()
            .from(benchmarkEntries)
            .where(eq(benchmarkEntries.benchmarkId, b.id))
            .all();
        return {
            ...b,
            entries
        };
    });
}

export async function getActiveBenchmarks() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return [];

    return db.select()
        .from(benchmarks)
        .where(
            and(
                eq(benchmarks.userId, session.user.id),
                eq(benchmarks.status, "running")
            )
        )
        .all();
}

export async function clearBenchmarkData() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    db.delete(benchmarkEntries).where(
        inArray(
            benchmarkEntries.benchmarkId,
            db.select({ id: benchmarks.id }).from(benchmarks).where(eq(benchmarks.userId, session.user.id))
        )
    ).run();

    db.delete(benchmarks).where(eq(benchmarks.userId, session.user.id)).run();

    revalidatePath("/evaluation-lab");
}
