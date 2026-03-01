import React from "react";
import { getCachedRepositories } from "@/app/actions/repositories";
import RepositoryList from "@/components/RepositoryList";
import SyncButton from "@/components/SyncButton";

export default async function RepositoriesPage() {
    const repos = await getCachedRepositories();

    return (
        <div className="max-w-7xl mx-auto px-4 py-12 md:py-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                <div>
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
                        Repositories
                    </h1>
                    <p className="text-lg text-foreground/40 max-w-2xl">
                        A centralized view of all your git repositories across multiple sources.
                    </p>
                </div>
                <div className="shrink-0">
                    <SyncButton />
                </div>
            </div>

            <RepositoryList initialRepos={repos} />
        </div>
    );
}
