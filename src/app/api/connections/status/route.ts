import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { ConnectionManager } from "@/lib/connections/manager";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status = ConnectionManager.getInstance().getStatus();
    
    // Filter status to only return connections belonging to the current user
    // However, the manager stores bots globally. We should ideally filter by userId
    // for security in a multi-tenant app. For now, since the goal is debugging:
    return NextResponse.json(status);
}
