import React from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { redirect } from "next/navigation";
import { ChatService } from "@/lib/chat/service";
import { getAgentConfigs } from "@/app/actions/config";
import ChatPageClient from "./ChatPageClient";

export const dynamic = "force-dynamic";

export default async function UnifiedChatPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect("/login");
    }

    const threadsData = await ChatService.getUserChats(session.user.id);
    const agentsData = await getAgentConfigs();

    const threads = threadsData.map((t) => ({
        id: t.id,
        title: t.title || "Untitled Chat",
        type: t.type as "web" | "discord",
        agentId: t.agentId || undefined,
        updatedAt: new Date(t.updatedAt),
        lastMessage: "Click to view history"
    }));

    const agents = agentsData.map((a) => ({ id: a.id, name: a.name }));

    return (
        <ChatPageClient initialThreads={threads} initialAgents={agents} />
    );
}
