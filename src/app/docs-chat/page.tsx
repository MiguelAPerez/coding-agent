import React from "react";
import { getCachedRepositories } from "@/app/actions/repositories";
import { getAgentConfigs } from "@/app/actions/config";
import DocsChatLayout from "@/components/DocsChat/DocsChatLayout";

import { Repository } from "@/components/DocsChat/DocsSidebar";

import { loadRepoData } from "@/lib/mockDataLoader";

export default async function DocsChatPage() {
    // Fetch all repositories and agents for the current user
    const [allRepos, initialAgents] = await Promise.all([
        getCachedRepositories(),
        getAgentConfigs()
    ]);
    let agents = initialAgents;

    const configRepo = allRepos.find(r => r.isConfigRepository);
    if (configRepo) {
        try {
            const repoData = await loadRepoData(configRepo.fullName, 'agent-config');
            if (repoData.agents.length > 0) {
                agents = repoData.agents as unknown as typeof agents;
            }
        } catch (error) {
            console.error("Failed to load repo data:", error);
        }
    }

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
