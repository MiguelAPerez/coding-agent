import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { db } from "@/../db";
import { chats } from "@/../db/schema";
import { eq, and } from "drizzle-orm";

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
        const { agentId, title } = await req.json();
        
        const [updatedChat] = await db.update(chats)
            .set({ 
                agentId, 
                title,
                updatedAt: new Date() 
            })
            .where(and(
                eq(chats.id, id),
                eq(chats.userId, session.user.id)
            ))
            .returning();

        return NextResponse.json(updatedChat);
    } catch (error) {
        console.error("PATCH /api/chats/[id] error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
