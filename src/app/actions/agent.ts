"use server";

import { db } from "@/../db";
import { agentConfigurations, skills, tools, contextGroups, benchmarkRuns, benchmarks, benchmarkEntries } from "@/../db/schema";
import { eq, desc } from "drizzle-orm";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { revalidatePath } from "next/cache";


export async function getAgentConfig() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return null;

    const config = db.select().from(agentConfigurations).where(eq(agentConfigurations.userId, session.user.id)).get();
    return config || null;
}

export async function saveAgentConfig(data: { model: string; systemPrompt: string; temperature: number }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const now = new Date();
    const result = db.insert(agentConfigurations)
        .values({
            userId: session.user.id,
            model: data.model,
            systemPrompt: data.systemPrompt,
            temperature: data.temperature,
            updatedAt: now,
        })
        .onConflictDoUpdate({
            target: agentConfigurations.userId,
            set: {
                model: data.model,
                systemPrompt: data.systemPrompt,
                temperature: data.temperature,
                updatedAt: now,
            }
        })
        .returning()
        .get();

    revalidatePath("/agent");
    return result;
}

export async function getSkills() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return [];

    return db.select().from(skills).where(eq(skills.userId, session.user.id)).all();
}

export async function saveSkill(data: { id?: string; name: string; description: string; content: string; isEnabled: boolean }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const now = new Date();
    if (data.id) {
        db.update(skills)
            .set({
                name: data.name,
                description: data.description,
                content: data.content,
                isEnabled: data.isEnabled,
                updatedAt: now,
            })
            .where(eq(skills.id, data.id))
            .run();
    } else {
        db.insert(skills)
            .values({
                userId: session.user.id,
                name: data.name,
                description: data.description,
                content: data.content,
                isEnabled: data.isEnabled,
                updatedAt: now,
            })
            .run();
    }

    revalidatePath("/agent");
}

export async function deleteSkill(id: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    db.delete(skills).where(eq(skills.id, id)).run();
    revalidatePath("/agent");
}

export async function getTools() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return [];

    return db.select().from(tools).where(eq(tools.userId, session.user.id)).all();
}

export async function saveTool(data: { id?: string; name: string; description: string; schema: string; isEnabled: boolean }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const now = new Date();
    if (data.id) {
        db.update(tools)
            .set({
                name: data.name,
                description: data.description,
                schema: data.schema,
                isEnabled: data.isEnabled,
                updatedAt: now,
            })
            .where(eq(tools.id, data.id))
            .run();
    } else {
        db.insert(tools)
            .values({
                userId: session.user.id,
                name: data.name,
                description: data.description,
                schema: data.schema,
                isEnabled: data.isEnabled,
                updatedAt: now,
            })
            .run();
    }

    revalidatePath("/agent");
}

export async function deleteTool(id: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    db.delete(tools).where(eq(tools.id, id)).run();
    revalidatePath("/agent");
}

export async function getContextGroups() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return [];

    return db.select().from(contextGroups).where(eq(contextGroups.userId, session.user.id)).all();
}

export async function saveContextGroup(data: { id?: string; name: string; description?: string; promptTemplate: string; skillIds?: string; toolIds?: string }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const now = new Date();
    if (data.id) {
        db.update(contextGroups)
            .set({
                name: data.name,
                description: data.description,
                promptTemplate: data.promptTemplate,
                skillIds: data.skillIds,
                toolIds: data.toolIds,
                updatedAt: now,
            })
            .where(eq(contextGroups.id, data.id))
            .run();
    } else {
        db.insert(contextGroups)
            .values({
                userId: session.user.id,
                name: data.name,
                description: data.description,
                promptTemplate: data.promptTemplate,
                skillIds: data.skillIds,
                toolIds: data.toolIds,
                updatedAt: now,
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

export async function saveBenchmarkRun(data: { id?: string; name: string; models: string[]; contextGroupIds: string[] }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const now = new Date();
    if (data.id) {
        db.update(benchmarkRuns)
            .set({
                name: data.name,
                models: JSON.stringify(data.models),
                contextGroupIds: JSON.stringify(data.contextGroupIds),
                updatedAt: now,
            })
            .where(eq(benchmarkRuns.id, data.id))
            .run();
    } else {
        db.insert(benchmarkRuns)
            .values({
                userId: session.user.id,
                name: data.name,
                models: JSON.stringify(data.models),
                contextGroupIds: JSON.stringify(data.contextGroupIds),
                updatedAt: now,
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

    const benchmarkId = crypto.randomUUID();
    const now = new Date();

    // Create benchmark session
    db.insert(benchmarks)
        .values({
            id: benchmarkId,
            userId: session.user.id,
            runId: runId,
            name: run.name,
            status: "running",
            startedAt: now,
            totalEntries: models.length * contextGroupIds.length,
            completedEntries: 0,
        })
        .run();

    // Create entries
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

export async function runBenchmark(name: string, models: string[], contextGroupIds: string[]) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const benchmarkId = crypto.randomUUID();
    const now = new Date();

    // Create benchmark session
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

    // Create entries
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

    // In a real app, we'd trigger an async worker here.
    // For this prototype, we'll simulate the progress in the client or a background "task" if possible.
    // Since we don't have a real worker, we'll return the ID so the client can poll or we can simulate updates.

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

    // Get the most recent benchmark for this user
    return db.select()
        .from(benchmarks)
        .where(eq(benchmarks.userId, session.user.id))
        .orderBy(desc(benchmarks.startedAt))
        .get();
}


// Simulated update for the prototype
export async function simulateBenchmarkStep(benchmarkId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const allEntries = db.select()
        .from(benchmarkEntries)
        .where(eq(benchmarkEntries.benchmarkId, benchmarkId))
        .all();

    const nextPendingEntry = allEntries.find(e => e.status === "pending");

    if (!nextPendingEntry) {
        db.update(benchmarks)
            .set({ status: "completed", completedAt: new Date() })
            .where(eq(benchmarks.id, benchmarkId))
            .run();
        return { finished: true };
    }

    // Get context group details
    const cg = db.select().from(contextGroups).where(eq(contextGroups.id, nextPendingEntry.contextGroupId)).get();

    // Simulating the "things we are testing" from benchmark_models.mjs
    const mockTestCases = [
        {
            category: "Technical",
            name: "Gotify REST API",
            prompt: "How do I send a notification using Gotify's REST API?",
            control: ["POST", "/message", "token", "message"],
        },
        {
            category: "Code Generation",
            name: "React Hook",
            prompt: "Write a simple React useLocalStorage hook.",
            control: ["useState", "useEffect", "JSON.stringify", "localStorage.getItem"],
        },
        {
            category: "Data Extraction",
            name: "Messy Log Parser",
            prompt: "Extract the IP address from: '[2024-05-20 12:00:01] ERROR (192.168.1.45)'",
            control: ["192.168.1.45"],
        }
    ];

    const testCase = mockTestCases.find(t => t.name === cg?.name) || mockTestCases[Math.floor(Math.random() * mockTestCases.length)];

    const startedAt = new Date();
    db.update(benchmarkEntries)
        .set({ status: "running", startedAt })
        .where(eq(benchmarkEntries.id, nextPendingEntry.id))
        .run();

    // Simulate work/latency
    const duration = Math.floor(Math.random() * 2000) + 1000;
    const completedAt = new Date(startedAt.getTime() + duration);

    // Simulate model output
    const output = `Simulated response for ${nextPendingEntry.model}. Here are some keywords: ${testCase.control.slice(0, Math.floor(Math.random() * testCase.control.length) + 1).join(", ")}. Performance is good.`;

    // Scoring logic
    let matches = 0;
    const matchDetails = testCase.control.map(keyword => {
        const found = output.toLowerCase().includes(keyword.toLowerCase());
        if (found) matches++;
        return { keyword, found };
    });

    const score = Math.round((matches / testCase.control.length) * 100);

    db.update(benchmarkEntries)
        .set({
            status: "completed",
            completedAt,
            duration,
            output,
            category: testCase.category,
            score,
            prompt: testCase.prompt,
            systemContext: cg?.promptTemplate || "",
            metrics: JSON.stringify({
                keywordMatches: matchDetails,
                modelName: nextPendingEntry.model,
                throughput: Math.round(output.length / (duration / 1000))
            })
        })
        .where(eq(benchmarkEntries.id, nextPendingEntry.id))
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

