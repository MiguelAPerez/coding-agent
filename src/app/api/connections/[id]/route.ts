import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { db } from "@/../db";
import { connections } from "@/../db/schema";
import { eq, and } from "drizzle-orm";
import { ConnectionManager } from "@/lib/connections/manager";

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await params;
        const { enabled } = await req.json();
        
        const [conn] = await db.update(connections)
            .set({ enabled, updatedAt: new Date() })
            .where(and(
                eq(connections.id, id),
                eq(connections.userId, session.user.id)
            ))
            .returning();

        if (conn) {
            if (enabled) {
                await ConnectionManager.getInstance().startConnection(conn.id, conn.type, conn.userId, conn.config);
            } else {
                await ConnectionManager.getInstance().stopConnection(conn.id);
            }
        }

        return NextResponse.json(conn);
    } catch (error) {
        console.error("PATCH /api/connections/[id] error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
