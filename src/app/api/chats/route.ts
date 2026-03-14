import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { ChatService } from "@/lib/chat/service";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const chats = await ChatService.getUserChats(session.user.id);
        return NextResponse.json(chats);
    } catch (error) {
        console.error("GET /api/chats error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { agentId, repoId, title } = await req.json();
        const chat = await ChatService.createChat({
            userId: session.user.id,
            agentId,
            repoId,
            title,
            type: "web"
        });
        return NextResponse.json(chat);
    } catch (error) {
        console.error("POST /api/chats error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
