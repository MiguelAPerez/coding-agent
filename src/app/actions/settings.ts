"use server";

import { db } from "@/../db";
import { users } from "@/../db/schema";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { revalidatePath } from "next/cache";

/**
 * Get the branch protection status for the current user
 */
export async function getBranchProtection() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const user = db.select({
        mainBranchProtected: users.mainBranchProtected
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .get();

    return user?.mainBranchProtected ?? true;
}

/**
 * Update the branch protection status
 */
export async function updateBranchProtection(enabled: boolean) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    db.update(users)
        .set({ mainBranchProtected: enabled })
        .where(eq(users.id, session.user.id))
        .run();

    revalidatePath("/settings");
    return { success: true };
}
