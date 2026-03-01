"use client";

import React, { useState } from "react";
import { AgentConfigForm } from "./AgentConfigForm";
import { SkillsManager } from "./SkillsManager";
import { ToolsManager } from "./ToolsManager";
import { AgentConfig, Skill, Tool } from "@/types/agent";

export const AgentPageClient = ({
    config,
    initialSkills,
    initialTools
}: {
    config: AgentConfig | null;
    initialSkills: Skill[];
    initialTools: Tool[];
}) => {
    const [activeTab, setActiveTab] = useState("model");

    const tabs = [
        { id: "model", label: "Model & Prompt" },
        { id: "skills", label: "Skills" },
        { id: "tools", label: "Tools" },
    ];

    return (
        <div className="space-y-8">
            <div className="flex gap-1 p-1 bg-foreground/5 rounded-2xl w-fit border border-border/50">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id
                            ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                            : "text-foreground/40 hover:text-foreground/60 hover:bg-foreground/5"
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="mt-8 transition-all animate-in fade-in slide-in-from-bottom-2 duration-500">
                {activeTab === "model" && <AgentConfigForm initialConfig={config} />}
                {activeTab === "skills" && <SkillsManager initialSkills={initialSkills} />}
                {activeTab === "tools" && <ToolsManager initialTools={initialTools} />}
            </div>
        </div>
    );
};
