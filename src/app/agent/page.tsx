import React from "react";
import { getAgentConfigs, syncManagedAgents } from "@/app/actions/config";
import { getSkills } from "@/app/actions/skills";
import { getTools } from "@/app/actions/tools";
import { getSystemPrompts, syncManagedPersonas } from "@/app/actions/prompts";
import { AgentPageClient } from "@/components/AgentConfiguration/AgentPageClient";

import { getCachedRepositories, getRepoDataByFullName } from "@/app/actions/repositories";
import { SystemPrompt } from "@/types/agent";

export default async function AgentPage({
    searchParams
}: {
    searchParams: { repo?: string }
}) {
    const allRepos = await getCachedRepositories();
    const configRepo = allRepos.find(r => r.isConfigRepository);
    const targetRepo = searchParams.repo || configRepo?.fullName;

    if (targetRepo) {
        try {
            const repoData = await getRepoDataByFullName(targetRepo, 'agent-config');
            
            // Sync personas first since agents depend on them
            if (repoData.personas.length > 0) {
                await syncManagedPersonas(repoData.personas as unknown as SystemPrompt[]);
            } else {
                await syncManagedPersonas([]); // Clear if none in repo
            }

            if (repoData.agents.length > 0) {
                await syncManagedAgents(repoData.agents);
            } else {
                await syncManagedAgents([]); // Clear if none in repo
            }
        } catch (error) {
            console.error("Failed to sync repo data:", error);
        }
    }

    // Load after sync (now contains both local and managed)
    const configs = await getAgentConfigs();
    const systemPrompts = await getSystemPrompts();

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

