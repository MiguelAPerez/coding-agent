import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { getAgentConfigs } from "@/app/actions/config";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const agents = await getAgentConfigs();
        return NextResponse.json(agents);
    } catch (error) {
        console.error("GET /api/agents error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
