import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { chatWithAgentInternal } from "@/app/actions/chat";

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { repoId, filePath, prompt, agentId, history } = await req.json();

        if (!repoId || !prompt || !agentId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const response = await chatWithAgentInternal(
            repoId,
            filePath,
            prompt,
            agentId,
            session.user.id,
            history || []
        );

        return NextResponse.json(response);
    } catch (error) {
        console.error("API Chat Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
