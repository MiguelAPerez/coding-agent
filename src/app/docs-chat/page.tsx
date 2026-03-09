import React from "react";
import { getCachedRepositories } from "@/app/actions/repositories";
import { getAgentConfigs } from "@/app/actions/config";
import DocsChatLayout from "@/components/DocsChat/DocsChatLayout";

import { Repository } from "@/components/DocsChat/DocsSidebar";

export default async function DocsChatPage() {
    // Fetch all repositories and agents for the current user
    const [allRepos, agents] = await Promise.all([
        getCachedRepositories(),
        getAgentConfigs()
    ]);

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
