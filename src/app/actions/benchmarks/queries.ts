"use server";

import { db } from "@/../db";
import { benchmarks, benchmarkEntries } from "@/../db/schema";
import { eq, desc, and } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";

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

export async function getBenchmarks() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return [];

    return db.select()
        .from(benchmarks)
        .where(eq(benchmarks.userId, session.user.id))
        .orderBy(desc(benchmarks.startedAt))
        .all();
}

export async function getBenchmarkResults(benchmarkId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    return db.select()
        .from(benchmarkEntries)
        .where(eq(benchmarkEntries.benchmarkId, benchmarkId))
        .all();
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

export async function getAllBenchmarksMetadata() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return [];

    return db.select()
        .from(benchmarks)
        .where(eq(benchmarks.userId, session.user.id))
        .orderBy(desc(benchmarks.startedAt))
        .all();
}
