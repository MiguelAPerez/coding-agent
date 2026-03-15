"use client";

import React from "react";

interface PerformanceSummary {
    agentId: string;
    agentName: string;
    avgLatency: number;
    totalWeekTokens: number;
    totalMonthTokens: number;
}

export const AgentPerformanceTab = ({
    summaries
}: {
    summaries: PerformanceSummary[];
}) => {
    if (summaries.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-20 border-2 border-dashed border-foreground/10 rounded-3xl text-center space-y-4">
                <div className="text-4xl">📉</div>
                <h3 className="text-xl font-bold">No performance data yet</h3>
                <p className="text-foreground/40 max-w-xs"> Start a chat to see how your agents are performing. </p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {summaries.map((summary) => (
                    <div
                        key={summary.agentId}
                        className="group bg-background p-6 rounded-3xl border border-border/50 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all space-y-6"
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-lg font-black tracking-tight group-hover:text-primary transition-colors">
                                    {summary.agentName}
                                </h3>
                                <p className="text-[10px] uppercase font-bold text-foreground/20 tracking-widest">
                                    Real-world Performance
                                </p>
                            </div>
                            <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                        </div>

                        <div className="p-4 bg-foreground/5 rounded-2xl border border-foreground/5">
                            <span className="block text-[10px] uppercase font-bold text-foreground/30 mb-1">Avg Latency</span>
                            <span className="text-2xl font-black">{summary.avgLatency ? `${(summary.avgLatency / 1000).toFixed(1)}s` : "N/A"}</span>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-foreground/40 font-medium">Weekly Usage</span>
                                <span className="font-bold text-primary">{summary.totalWeekTokens.toLocaleString()} tokens</span>
                            </div>
                            <div className="h-1.5 w-full bg-foreground/5 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-primary transition-all duration-1000" 
                                    style={{ width: `${Math.min(100, (summary.totalWeekTokens / 50000) * 100)}%` }} // Arbitrary 50k token weekly target for viz
                                ></div>
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-foreground/30 font-bold uppercase tracking-tighter">
                                <span>Monthly Totals: {summary.totalMonthTokens.toLocaleString()} tokens</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Global Summary Info */}
            <div className="p-8 bg-primary/5 rounded-[2rem] border border-primary/10 flex flex-col md:flex-row items-center gap-8 justify-between">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl">
                        🚀
                    </div>
                    <div>
                        <h4 className="font-black text-lg">Real-time Metrics</h4>
                        <p className="text-sm text-foreground/60">Performance data is captured from your live chat interactions.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
