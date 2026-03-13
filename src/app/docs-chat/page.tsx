import React from "react";
import { getCachedRepositories, getRepoDataByFullName } from "@/app/actions/repositories";
import { getAgentConfigs, syncManagedAgents } from "@/app/actions/config";
import { syncManagedPersonas } from "@/app/actions/prompts";
import DocsChatLayout from "@/components/DocsChat/DocsChatLayout";
import { SystemPrompt } from "@/types/agent";

import { Repository } from "@/components/DocsChat/DocsSidebar";


export default async function DocsChatPage() {
    const allRepos = await getCachedRepositories();
    const configRepo = allRepos.find(r => r.isConfigRepository);

    if (configRepo) {
        try {
            const repoData = await getRepoDataByFullName(configRepo.fullName, 'agent-config');
            
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
    const agents = await getAgentConfigs();

    // Filter by topics and enabled status
    const docsRepos = allRepos.filter(repo => {
        const topics = repo.topics ? JSON.parse(repo.topics) : [];
        return repo.enabled !== false && topics.some((t: string) => t === "docs" || t === "documentation");
    });

    return (
        <main className="min-h-screen bg-background text-foreground flex flex-col">
            <DocsChatLayout 
                repositories={docsRepos as unknown as Repository[]} 
                agents={agents}
            />
        </main>
    );
}
