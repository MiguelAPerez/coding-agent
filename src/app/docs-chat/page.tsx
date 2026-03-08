import React from "react";
import { getCachedRepositories } from "@/app/actions/repositories";
import DocsChatLayout from "@/components/DocsChat/DocsChatLayout";

import { Repository } from "@/components/DocsChat/DocsSidebar";

export default async function DocsChatPage() {
    // Fetch all repositories for the current user
    const allRepos = await getCachedRepositories();
    
    // For now, we'll filter by metadata type or just pass all if no specific label exists yet
    // In a full implementation, you'd filter by a specific "docs" label
    // `repo.metadata?.type === "docs"` or similar, but let's pass all to start
    // since we haven't defined a "docs" label clearly in the DB.
    const docsRepos = allRepos;

    return (
        <main className="min-h-screen bg-background text-foreground flex flex-col">
            <DocsChatLayout repositories={docsRepos as unknown as Repository[]} />
        </main>
    );
}
