import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { ChatService } from "@/lib/chat/service";

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await params;
        const messages = await ChatService.getChatHistory(id);
        return NextResponse.json(messages);
    } catch (error) {
        console.error("GET /api/chats/[id]/messages error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await params;
        const { role, content } = await req.json();
        const message = await ChatService.saveMessage({
            chatId: id,
            role,
            content
        });
        return NextResponse.json(message);
    } catch (error) {
        console.error("POST /api/chats/[id]/messages error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
