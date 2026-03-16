import React from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/../db";
import { connections } from "@/../db/schema";
import { eq } from "drizzle-orm";
import { getAgentConfigs } from "@/app/actions/config";
import ConnectionsClient from "./ConnectionsClient";

export const dynamic = "force-dynamic";

export default async function ConnectionsSettingsPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect("/login");
    }

    const connsData = await db.query.connections.findMany({
        where: eq(connections.userId, session.user.id),
    });

    const agentsData = await getAgentConfigs();

    const conns = connsData.map((c) => ({
        id: c.id,
        name: c.name,
        enabled: c.enabled || false,
        type: c.type,
        config: c.config,
        agentId: c.agentId,
        tokenLimitDaily: c.tokenLimitDaily,
        metadata: c.metadata
    }));

    const agents = agentsData.map((a) => ({ id: a.id, name: a.name }));

    return (
        <ConnectionsClient initialConnections={conns} initialAgents={agents} />
    );
}
