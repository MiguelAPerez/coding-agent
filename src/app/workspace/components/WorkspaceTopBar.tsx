"use client";

import React from "react";

interface Repo {
    id: string;
    fullName: string;
}

interface WorkspaceTopBarProps {
    repos: Repo[];
    selectedRepoId: string;
    onSelectRepo: (id: string) => void;
    branches: string[];
    selectedBranch: string;
    onSelectBranch: (branch: string) => void;
}

export default function WorkspaceTopBar({
    repos,
    selectedRepoId,
    onSelectRepo,
    branches,
    selectedBranch,
    onSelectBranch
}: WorkspaceTopBarProps) {
    return (
        <div className="flex items-center gap-4 h-12 px-4 border-b border-border bg-background/50 backdrop-blur-md">
            <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-foreground/70">Repository</label>
                <select 
                    value={selectedRepoId}
                    onChange={(e) => onSelectRepo(e.target.value)}
                    className="p-1 px-2 text-sm bg-foreground/5 border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary w-48"
                >
                    {repos.length === 0 && <option value="">No enabled repos</option>}
                    {repos.map(r => (
                        <option key={r.id} value={r.id}>{r.fullName}</option>
                    ))}
                </select>
            </div>
            
            <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-foreground/70">Branch</label>
                <select 
                    value={selectedBranch}
                    onChange={(e) => onSelectBranch(e.target.value)}
                    className="p-1 px-2 text-sm bg-foreground/5 border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary w-48"
                >
                    {branches.length === 0 && <option value="">Loading...</option>}
                    {branches.map(b => (
                        <option key={b} value={b}>{b}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}
