import React from "react";
import { getAgentConfigs } from "@/app/actions/config";
import { getSkills } from "@/app/actions/skills";
import { getTools } from "@/app/actions/tools";
import { getSystemPrompts } from "@/app/actions/prompts";
import { AgentPageClient } from "@/components/AgentConfiguration/AgentPageClient";

import { getCachedRepositories, getRepoDataByFullName } from "@/app/actions/repositories";
import { SystemPrompt } from "@/types/agent";

export default async function AgentPage({
    searchParams
}: {
    searchParams: { repo?: string }
}) {
    let configs = await getAgentConfigs();
    let systemPrompts = await getSystemPrompts();

    const allRepos = await getCachedRepositories();
    const configRepo = allRepos.find(r => r.isConfigRepository);
    const targetRepo = searchParams.repo || configRepo?.fullName;

    if (targetRepo) {
        try {
            const repoData = await getRepoDataByFullName(targetRepo, 'agent-config');
            if (repoData.agents.length > 0) {
                const managedAgents = repoData.agents.map(a => ({ ...a, isManaged: true }));
                // Merge managed agents, keep database ones
                configs = [...configs, ...managedAgents] as unknown as typeof configs;
            }
            if (repoData.personas.length > 0) {
                const managedPersonas = repoData.personas.map(p => ({ ...p, isManaged: true }));
                // Merge managed personas, keep database ones
                systemPrompts = [...systemPrompts, ...managedPersonas] as unknown as SystemPrompt[];
            }
        } catch (error) {
            console.error("Failed to load repo data:", error);
        }
    }

    const initialSkills = await getSkills();
    const initialTools = await getTools();

    return (
        <div className="max-w-7xl mx-auto px-4 py-12 md:py-20 animate-in fade-in duration-700">
            <div className="mb-12">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
                    Agent Configuration
                </h1>
                <p className="text-lg text-foreground/40 max-w-2xl">
                    Configure your AI agents&apos; personalities, skills, and tools to tailor their behavior.
                </p>

            </div>

            <AgentPageClient
                configs={configs}
                initialSkills={initialSkills}
                initialTools={initialTools}
                systemPrompts={systemPrompts}
            />
        </div>
    );
}

