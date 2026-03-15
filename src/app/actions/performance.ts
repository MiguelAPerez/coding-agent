import { db } from "@/../db";
import { agentConfigurations, agentUsageStats } from "@/../db/schema";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";

export async function recordAgentUsage(agentId: string, inputTokens: number, outputTokens: number, duration: number) {
    const today = new Date().toISOString().split('T')[0];
    
    const existing = db.select().from(agentUsageStats).where(
        and(
            eq(agentUsageStats.agentId, agentId),
            eq(agentUsageStats.date, today)
        )
    ).get();

    if (existing) {
        db.update(agentUsageStats)
            .set({
                totalInputTokens: existing.totalInputTokens + inputTokens,
                totalOutputTokens: existing.totalOutputTokens + outputTokens,
                totalDuration: existing.totalDuration + duration,
                messageCount: existing.messageCount + 1,
                updatedAt: new Date()
            })
            .where(eq(agentUsageStats.id, existing.id))
            .run();
    } else {
        db.insert(agentUsageStats)
            .values({
                agentId,
                date: today,
                totalInputTokens: inputTokens,
                totalOutputTokens: outputTokens,
                totalDuration: duration,
                messageCount: 1,
                updatedAt: new Date()
            })
            .run();
    }
}

export async function getAgentPerformanceSummary() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return [];

    const agents = db.select().from(agentConfigurations).where(eq(agentConfigurations.userId, session.user.id)).all();
    
    // Calculate date thresholds
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const performanceSummaries = await Promise.all(agents.map(async (agent) => {
        // Real usage stats from agentUsageStats
        const allStats = db.select().from(agentUsageStats).where(eq(agentUsageStats.agentId, agent.id)).all();
        
        const weekStats = allStats.filter(s => s.date >= weekAgo);
        const monthStats = allStats.filter(s => s.date >= monthAgo);

        const totalWeekTokens = weekStats.reduce((acc, s) => acc + s.totalInputTokens + s.totalOutputTokens, 0);
        const totalMonthTokens = monthStats.reduce((acc, s) => acc + s.totalInputTokens + s.totalOutputTokens, 0);
        
        const totalDuration = allStats.reduce((acc, s) => acc + s.totalDuration, 0);
        const totalMessages = allStats.reduce((acc, s) => acc + s.messageCount, 0);
        const avgLatency = totalMessages > 0 ? Math.round(totalDuration / totalMessages) : 0;

        return {
            agentId: agent.id,
            agentName: agent.name,
            // New metrics
            avgLatency,
            totalWeekTokens,
            totalMonthTokens
        };
    }));

    return performanceSummaries;
}
