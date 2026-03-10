"use client";

import React, { useState } from "react";
import { cloneOrUpdateRepository, getRepoMarkdownFiles } from "@/app/actions/files";
import { semanticSearch } from "@/app/actions/semantic-search";
import { RepoSearchResult } from "@/app/actions/search";
import { BLOCKLIST } from "@/lib/constants";

export interface Repository {
    id: string;
    name: string;
    fullName: string;
    description: string | null;
    language: string | null;
    lastAnalyzedHash?: string | null;
    topics?: string | null;
    docsMetadata?: Record<string, unknown>;
    agentMetadata?: Record<string, unknown>;
    enabled?: boolean;
}

interface TreeNode {
    name: string;
    path: string;
    children: Record<string, TreeNode>;
}

function buildFileTree(files: string[]) {
    const root: TreeNode = { name: "root", path: "", children: {} };
    for (const file of files) {
        const parts = file.split('/');
        let current = root;
        let currentPath = "";
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            currentPath = currentPath ? `${currentPath}/${part}` : part;
            if (!current.children[part]) {
                current.children[part] = { name: part, path: currentPath, children: {} };
            }
            current = current.children[part];
        }
    }
    return root;
}

function FileTreeNode({ child, selectedFilePath, onSelectFile, depth }: { child: TreeNode, selectedFilePath: string | null, onSelectFile: (path: string) => void, depth: number }) {
    const [isExpanded, setIsExpanded] = useState(true);
    const isDir = Object.keys(child.children).length > 0;
    
    if (isDir) {
        return (
            <div>
                <button 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full px-2 py-1 text-xs font-medium text-foreground/70 flex items-center gap-1.5 hover:bg-foreground/5 transition-colors"
                    style={{ paddingLeft: `${depth * 0.75 + 0.5}rem` }}
                >
                    <svg className={`w-3.5 h-3.5 transition-transform shrink-0 ${isExpanded ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="truncate">{child.name}</span>
                </button>
                {isExpanded && (
                    <FileTree 
                        node={child} 
                        selectedFilePath={selectedFilePath} 
                        onSelectFile={onSelectFile} 
                        depth={depth + 1} 
                    />
                )}
            </div>
        );
    }

    const displayName = child.name.replace(/\.mdx?$/, "");
    const isSelected = selectedFilePath === child.path;

    return (
        <button
            onClick={() => onSelectFile(child.path)}
            className={`w-full text-left px-2 py-1 text-xs transition-colors flex items-center gap-1.5 truncate ${
                isSelected
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
            }`}
            style={{ paddingLeft: `${depth * 0.75 + 1.25}rem` }}
            title={child.path}
        >
            <svg className="w-3.5 h-3.5 shrink-0 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="truncate">{displayName}</span>
        </button>
    );
}

function FileTree({ node, selectedFilePath, onSelectFile, depth = 0 }: { node: TreeNode, selectedFilePath: string | null, onSelectFile: (path: string) => void, depth?: number }) {
    const entries = Object.values(node.children);
    
    // Sort directories first, then files
    entries.sort((a, b) => {
        const aIsDir = Object.keys(a.children).length > 0;
        const bIsDir = Object.keys(b.children).length > 0;
        if (aIsDir && !bIsDir) return -1;
        if (!aIsDir && bIsDir) return 1;
        return a.name.localeCompare(b.name);
    });

    return (
        <div className="py-0.5">
            {entries.map(child => (
                <FileTreeNode 
                    key={child.path} 
                    child={child} 
                    selectedFilePath={selectedFilePath} 
                    onSelectFile={onSelectFile} 
                    depth={depth} 
                />
            ))}
        </div>
    );
}

interface DocsSidebarProps {
    repositories: Repository[];
    selectedRepo: Repository | null;
    onSelectRepo: (repo: Repository) => void;
    selectedFilePath: string | null;
    onSelectFile: (filePath: string) => void;
}

export default function DocsSidebar({ 
    repositories, 
    selectedRepo, 
    onSelectRepo,
    selectedFilePath,
    onSelectFile
}: DocsSidebarProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [semanticResults, setSemanticResults] = useState<RepoSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [repoFiles, setRepoFiles] = useState<Record<string, string[]>>({});
    const [loadingRepo, setLoadingRepo] = useState<string | null>(null);

    // Debounce search query
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Perform semantic search
    React.useEffect(() => {
        if (!debouncedQuery.trim()) {
            setSemanticResults([]);
            return;
        }

        setIsSearching(true);
        semanticSearch({
            repoIds: repositories.map(r => r.id),
            query: debouncedQuery,
            limit: 10,
            includeExtensions: [".md", ".mdx"],
            extraBlocklist: BLOCKLIST
        })
        .then(results => {
            setSemanticResults(results as RepoSearchResult[]);
        })
        .catch(err => {
            console.error("Semantic search failed:", err);
            setSemanticResults([]);
        })
        .finally(() => {
            setIsSearching(false);
        });
    }, [debouncedQuery, repositories]);

    const filteredRepos = repositories.filter(repo => 
        repo.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        repo.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const groupedRepos = filteredRepos.reduce((acc, repo) => {
        const docsMetadata = repo.docsMetadata as Record<string, unknown> | undefined;
        const typeValue = docsMetadata?.type;
        const type = typeof typeValue === "string" ? typeValue : "Other";
        
        if (!acc[type]) acc[type] = [];
        acc[type].push(repo);
        return acc;
    }, {} as Record<string, Repository[]>);

    const handleRepoClick = (repo: Repository) => {
        onSelectRepo(repo);
    };

    React.useEffect(() => {
        if (!selectedRepo) return;
        const repoId = selectedRepo.id;
        
        if (!repoFiles[repoId] && loadingRepo !== repoId) {
            setLoadingRepo(repoId);
            cloneOrUpdateRepository(repoId)
                .then(() => getRepoMarkdownFiles(repoId))
                .then(files => {
                    setRepoFiles(prev => ({ ...prev, [repoId]: files || [] }));
                })
                .catch(err => {
                    console.error("Failed to load repo files:", err);
                    setRepoFiles(prev => ({ ...prev, [repoId]: [] })); // Set empty to avoid infinite loading
                })
                .finally(() => {
                    setLoadingRepo(null);
                });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedRepo?.id]);

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-border/50">
                <h2 className="text-lg font-semibold mb-4">Documentation</h2>
                <input 
                    type="text" 
                    placeholder="Search docs..." 
                    className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground/50"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                {isSearching && (
                    <div className="mt-2 flex items-center gap-2 text-[10px] text-foreground/40 animate-pulse">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        Searching docs...
                    </div>
                )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Semantic Results Section */}
                {semanticResults.length > 0 && searchQuery.trim() && (
                    <div className="space-y-3 pb-4 border-b border-border/10">
                        <h3 className="text-xs font-medium text-primary uppercase tracking-wider pl-2 flex items-center gap-1.5">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                            </svg>
                            Suggested Files
                        </h3>
                        <div className="space-y-1">
                            {semanticResults.map(repoRes => (
                                repoRes.matches.map((match, i) => (
                                    <button
                                        key={`${repoRes.repoId}-${match.filePath}-${i}`}
                                        onClick={() => {
                                            const repo = repositories.find(r => r.id === repoRes.repoId);
                                            if (repo) {
                                                onSelectRepo(repo);
                                                onSelectFile(match.filePath);
                                            }
                                        }}
                                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors group ${
                                            selectedFilePath === match.filePath && selectedRepo?.id === repoRes.repoId
                                                ? "bg-primary/10 text-primary"
                                                : "hover:bg-foreground/5"
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-0.5">
                                            <span className="text-xs font-medium truncate flex-1 leading-tight mr-2">
                                                {match.filePath.split('/').pop()?.replace(/\.mdx?$/, "")}
                                            </span>
                                            {match.similarity && (
                                                <span className="text-[9px] font-bold text-primary/60 shrink-0 mt-0.5">
                                                    {Math.round(match.similarity * 100)}%
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-[10px] text-foreground/40 truncate">
                                            {repoRes.repoName} • {match.filePath.split('/').slice(0, -1).join('/') || '/'}
                                        </div>
                                    </button>
                                ))
                            ))}
                        </div>
                    </div>
                )}
                {Object.entries(groupedRepos).map(([group, repos]) => (
                    <div key={group}>
                        <h3 className="text-xs font-medium text-foreground/50 uppercase tracking-wider mb-2 pl-2">
                            {group}
                        </h3>
                        <div className="space-y-1">
                            {repos.map((repo) => (
                                <div key={repo.id} className={repo.enabled === false ? "opacity-40 pointer-events-none" : ""}>
                                    <button
                                        onClick={() => handleRepoClick(repo)}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                                            selectedRepo?.id === repo.id 
                                                ? "bg-foreground/10 font-medium" 
                                                : "hover:bg-foreground/5"
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            {loadingRepo === repo.id ? (
                                                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shrink-0" title="Loading..." />
                                            ) : repoFiles[repo.id] || repo.lastAnalyzedHash ? (
                                                <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" title="Loaded" />
                                            ) : (
                                                <div className="w-2 h-2 rounded-full bg-foreground/20 shrink-0" title="Not loaded" />
                                            )}
                                            <span className="truncate">{repo.name}</span>
                                        </div>
                                    </button>
                                    
                                    {/* Sub-list of Markdown Files */}
                                    {selectedRepo?.id === repo.id && repoFiles[repo.id] && (
                                        <div className="mt-1 border-t border-border/10">
                                            {repoFiles[repo.id].length === 0 && loadingRepo !== repo.id ? (
                                                <div className="px-4 py-2 text-xs text-foreground/40 italic">
                                                    No markdown files found.
                                                </div>
                                            ) : (
                                                <FileTree 
                                                    node={buildFileTree(repoFiles[repo.id])} 
                                                    selectedFilePath={selectedFilePath} 
                                                    onSelectFile={onSelectFile} 
                                                />
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                {filteredRepos.length === 0 && (
                    <div className="text-center text-sm text-foreground/40 mt-8">
                        No documentation found.
                    </div>
                )}
            </div>
        </div>
    );
}
