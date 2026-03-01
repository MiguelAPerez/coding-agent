"use client";

import React from "react";

interface Repository {
    id: string;
    source: string;
    fullName: string;
    description: string | null;
    url: string;
    stars: number | null;
    forks: number | null;
    language: string | null;
    metadata: Record<string, string>;
}

export default function RepositoryCard({ repo }: { repo: Repository }) {
    const isGitea = repo.source === "gitea";

    return (
        <div className="glass p-6 rounded-2xl border border-border group hover:border-primary/30 transition-all duration-300 flex flex-col h-full">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${isGitea ? 'bg-[#6343ac] shadow-[#6343ac]/20' : 'bg-[#24292e] shadow-black/20'}`}>
                        {isGitea ? (
                            <span className="text-white font-bold text-lg">G</span>
                        ) : (
                            <span className="text-white font-bold text-lg">H</span>
                        )}
                    </div>
                    <div>
                        <h3 className="font-bold text-lg group-hover:text-primary transition-colors truncate max-w-[200px]" title={repo.fullName}>
                            {repo.fullName.split('/').pop()}
                        </h3>
                        <p className="text-[10px] uppercase tracking-widest font-bold text-foreground/40">
                            {repo.fullName.split('/')[0]}
                        </p>
                    </div>
                </div>
                {repo.metadata.type && (
                    <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        {repo.metadata.type}
                    </span>
                )}
            </div>

            <p className="text-sm text-foreground/60 line-clamp-2 mb-6 flex-grow">
                {repo.description || "No description provided."}
            </p>

            <div className="flex items-center gap-4 text-xs font-medium text-foreground/40 mb-6 flex-wrap">
                {repo.language && (
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                        <span>{repo.language}</span>
                    </div>
                )}
                {repo.stars !== null && repo.stars > 0 && (
                    <div className="flex items-center gap-1.5">
                        <span>⭐</span>
                        <span>{repo.stars}</span>
                    </div>
                )}
                {repo.forks !== null && repo.forks > 0 && (
                    <div className="flex items-center gap-1.5">
                        <span>🍴</span>
                        <span>{repo.forks}</span>
                    </div>
                )}
            </div>

            <div className="pt-4 border-t border-border mt-auto flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isGitea ? 'bg-[#6343ac]' : 'bg-[#24292e]'}`}></span>
                    <span className="text-[10px] uppercase tracking-tighter font-bold text-foreground/40">{repo.source}</span>
                </div>
                <a
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                >
                    View Source
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                </a>
            </div>
        </div>
    );
}
