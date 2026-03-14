"use server";

import { db } from "@/../db";
import { benchmarkRuns } from "@/../db/schema";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { revalidatePath } from "next/cache";

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
    parallelWorkers?: number;
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
        parallelWorkers: data.parallelWorkers || 1,
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
