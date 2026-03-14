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
        const { enabled, name, config } = await req.json();

        const updateData: { updatedAt: Date, enabled?: boolean, name?: string, config?: string } = { updatedAt: new Date() };
        if (enabled !== undefined) updateData.enabled = enabled;
        if (name !== undefined) updateData.name = name;
        if (config !== undefined) updateData.config = config;

        const [conn] = await db.update(connections)
            .set(updateData)
            .where(and(
                eq(connections.id, id),
                eq(connections.userId, session.user.id)
            ))
            .returning();

        if (conn) {
            // Restart connection if it's enabled and something changed
            if (conn.enabled) {
                await ConnectionManager.getInstance().stopConnection(conn.id);
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

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await params;

        // Stop the connection first
        await ConnectionManager.getInstance().stopConnection(id);

        const [deleted] = await db.delete(connections)
            .where(and(
                eq(connections.id, id),
                eq(connections.userId, session.user.id)
            ))
            .returning();

        if (!deleted) {
            return NextResponse.json({ error: "Connection not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE /api/connections/[id] error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
