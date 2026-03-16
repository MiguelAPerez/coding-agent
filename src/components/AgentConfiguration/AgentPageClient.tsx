"use client";

import React, { useState } from "react";
import { AgentConfigForm } from "./AgentConfigForm";
import { SkillsManager } from "./SkillsManager";
import { ToolsManager } from "@/components/AgentConfiguration/ToolsManager";
import { AgentPerformanceTab } from "./AgentPerformanceTab";
import { SystemPromptsManager } from "./SystemPromptsManager";
import SkillLibraryManager from "./SkillLibraryManager";
import { AgentConfig, Skill, Tool, SystemPrompt } from "@/types/agent";

export const AgentPageClient = ({
    configs,
    initialSkills,
    initialTools,
    systemPrompts,
    performanceSummaries
}: {
    configs: AgentConfig[];
    initialSkills: Skill[];
    initialTools: Tool[];
    systemPrompts: SystemPrompt[];
    performanceSummaries: {
        agentId: string;
        agentName: string;
        avgLatency: number;
        totalWeekTokens: number;
        totalMonthTokens: number;
    }[];
}) => {
    const [mainTab, setMainTab] = useState("performance");
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(configs[0]?.id || null);
    const [configTab, setConfigTab] = useState("model");

    const selectedAgent = configs.find(c => c.id === selectedAgentId) || null;
    const agentTools = initialTools.filter(t => t.agentId === selectedAgentId);

    const mainTabs = [
        { id: "performance", label: "Performance", icon: "📈" },
        { id: "configuration", label: "Configuration", icon: "⚙️" },
        { id: "persona", label: "Persona", icon: "👤" },
        { id: "skills", label: "Skills", icon: "🛠️" },
    ];

    const configTabs = [
        { id: "model", label: "Model & Prompt" },
        { id: "skills", label: "Skills" },
        { id: "tools", label: "Tools" },
    ];

    return (
        <div className="flex flex-col md:flex-row gap-10">
            {/* Main Nav Sidebar */}
            <div className="w-full md:w-56 space-y-6">
                <div className="space-y-1">
                    {mainTabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setMainTab(tab.id)}
                            className={`w-full px-4 py-3 rounded-xl text-left text-sm font-bold transition-all flex items-center gap-3 ${mainTab === tab.id
                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                : "text-foreground/40 hover:text-foreground/60 hover:bg-foreground/5"
                                }`}
                        >
                            <span>{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 min-h-[600px]">
                {mainTab === "performance" && (
                    <AgentPerformanceTab summaries={performanceSummaries} />
                )}

                {mainTab === "persona" && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                        <SystemPromptsManager initialPrompts={systemPrompts} />
                    </div>
                )}

                {mainTab === "skills" && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                        <SkillLibraryManager />
                    </div>
                )}

                {mainTab === "configuration" && (
                    <div className="flex flex-col md:flex-row gap-8 animate-in fade-in slide-in-from-right-4 duration-500">
                        {/* Agent Sidebar (Internal to Configuration) */}
                        <div className="w-full md:w-64 space-y-4">
                            <button
                                onClick={() => {
                                    setSelectedAgentId(null);
                                    setConfigTab("model");
                                }}
                                className={`w-full px-4 py-3 rounded-xl text-left text-sm font-medium transition-all ${selectedAgentId === null
                                    ? "bg-foreground text-background shadow-lg shadow-foreground/10"
                                    : "bg-foreground/5 text-foreground/60 hover:bg-foreground/10"
                                    }`}
                            >
                                + Create New Agent
                            </button>

                            <div className="space-y-1">
                                <label className="text-[10px] uppercase tracking-wider font-bold text-foreground/30 px-4">Your Agents</label>
                                {configs.map((agent) => (
                                    <button
                                        key={agent.id}
                                        onClick={() => setSelectedAgentId(agent.id)}
                                        className={`w-full px-4 py-3 rounded-xl text-left text-sm font-medium transition-all flex items-center justify-between ${selectedAgentId === agent.id
                                            ? "bg-foreground/10 text-foreground ring-1 ring-foreground/20"
                                            : "text-foreground/60 hover:bg-foreground/5"
                                            }`}
                                    >
                                        <span>{agent.name}</span>
                                        {agent.isManaged && (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Config Content */}
                        <div className="flex-1 space-y-8">
                            <div className="flex gap-1 p-1 bg-foreground/5 rounded-2xl w-fit border border-border/50">
                                {configTabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setConfigTab(tab.id)}
                                        className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${configTab === tab.id
                                            ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                                            : "text-foreground/40 hover:text-foreground/60 hover:bg-foreground/5"
                                            }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            <div className="transition-all">
                                {configTab === "model" && (
                                    <AgentConfigForm
                                        key={selectedAgentId || "new"}
                                        initialConfig={selectedAgent}
                                        systemPrompts={systemPrompts}
                                    />
                                )}
                                {configTab === "skills" && (
                                    <SkillsManager
                                        initialSkills={initialSkills}
                                        agent={selectedAgent}
                                    />
                                )}
                                {configTab === "tools" && (
                                    <ToolsManager
                                        initialTools={agentTools}
                                        agentId={selectedAgentId}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
