"use server";

import { db } from "@/../db";
import { tools } from "@/../db/schema";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { revalidatePath } from "next/cache";

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
