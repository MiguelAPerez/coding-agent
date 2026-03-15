import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { db } from "@/../db";
import { connections } from "@/../db/schema";
import { eq } from "drizzle-orm";
import { ConnectionManager } from "@/lib/connections/manager";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const conns = await db.query.connections.findMany({
            where: eq(connections.userId, session.user.id),
        });
        return NextResponse.json(conns);
    } catch (error) {
        console.error("GET /api/connections error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { type, name, config, agentId, metadata, tokenLimitDaily } = await req.json();
        const [conn] = await db.insert(connections).values({
            userId: session.user.id,
            agentId,
            type,
            name,
            config,
            metadata,
            tokenLimitDaily,
            enabled: true,
        }).returning();

        // Automatically start the bot with all settings
        await ConnectionManager.getInstance().startConnection(
            conn.id, 
            type, 
            session.user.id, 
            config, 
            agentId, 
            metadata, 
            tokenLimitDaily
        );

        return NextResponse.json(conn);
    } catch (error) {
        console.error("POST /api/connections error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
