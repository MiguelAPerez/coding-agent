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
    onCreateBranch: (name: string) => void;
    isTerminalOpen: boolean;
    onToggleTerminal: () => void;
    sandboxName?: string;
    isProtected?: boolean;
}

export default function WorkspaceTopBar({
    repos,
    selectedRepoId,
    onSelectRepo,
    branches,
    selectedBranch,
    onSelectBranch,
    onCreateBranch,
    isTerminalOpen,
    onToggleTerminal,
    sandboxName,
    isProtected
}: WorkspaceTopBarProps) {
    const [isCreatingBranch, setIsCreatingBranch] = React.useState(false);
    const [newBranchName, setNewBranchName] = React.useState("");

    const handleCreateBranch = () => {
        if (newBranchName.trim()) {
            onCreateBranch(newBranchName.trim());
            setNewBranchName("");
            setIsCreatingBranch(false);
        }
    };
    return (
        <div className="flex items-center gap-4 h-12 px-4 border-b border-border bg-background/50 backdrop-blur-md">
            <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-foreground/70">Repository</label>
                <select
                    value={selectedRepoId}
                    onChange={(e) => onSelectRepo(e.target.value)}
                    className="p-1 px-2 text-sm bg-foreground/5 border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary w-48"
                >
                    <option value="">Select Repository...</option>
                    {repos.map(r => (
                        <option key={r.id} value={r.id}>{r.fullName}</option>
                    ))}
                </select>
            </div>

            <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-foreground/70">Branch</label>
                {!isCreatingBranch ? (
                    <div className="flex items-center gap-2">
                        <select
                            value={selectedBranch}
                            onChange={(e) => onSelectBranch(e.target.value)}
                            className="p-1 px-2 text-sm bg-foreground/5 border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary w-48"
                        >
                            {!selectedRepoId ? (
                                <option value="">[None]</option>
                            ) : branches.length === 0 ? (
                                <option value="">Loading...</option>
                            ) : null}
                            {branches.map(b => (
                                <option key={b} value={b}>{b}</option>
                            ))}
                        </select>
                        {selectedRepoId && (
                            <button
                                onClick={() => setIsCreatingBranch(true)}
                                className="p-1 px-2 text-xs font-semibold bg-primary text-primary-foreground rounded hover:bg-primary/90"
                                title="Create new branch"
                            >
                                + New
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <input
                            autoFocus
                            type="text"
                            value={newBranchName}
                            onChange={(e) => setNewBranchName(e.target.value)}
                            placeholder="Branch name..."
                            className="p-1 px-2 text-sm bg-foreground/5 border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary w-32"
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleCreateBranch();
                                if (e.key === "Escape") setIsCreatingBranch(false);
                            }}
                        />
                        <button
                            onClick={handleCreateBranch}
                            className="p-1 px-2 text-xs font-semibold bg-primary text-primary-foreground rounded hover:bg-primary/90"
                        >
                            Create
                        </button>
                        <button
                            onClick={() => setIsCreatingBranch(false)}
                            className="p-1 px-2 text-xs font-semibold bg-foreground/10 text-foreground rounded hover:bg-foreground/20"
                        >
                            Cancel
                        </button>
                    </div>
                )}
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-3">
                {sandboxName && (
                    <div className="flex items-center gap-2 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-tight">Sandbox: {sandboxName}</span>
                    </div>
                )}
                {!isProtected && (
                    <button
                        onClick={onToggleTerminal}
                        className={`flex items-center gap-2 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                            isTerminalOpen 
                            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
                            : 'bg-foreground/5 text-foreground/60 hover:bg-foreground/10 hover:text-foreground'
                        }`}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m7 15 5-5-5-5"/><path d="m11 19 6-6-6-6"/>
                        </svg>
                        Terminal
                    </button>
                )}
            </div>
        </div>
    );
}
