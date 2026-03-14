import React, { useState } from "react";
import { RepoSearchResult } from "@/app/actions/search";
import { FileResults } from "./FileResults";

export function RepoResults({ result, query }: { result: RepoSearchResult; query: string }) {
    const [collapsed, setCollapsed] = useState(false);

    // Group matches by file
    const byFile = result.matches.reduce<Record<string, typeof result.matches>>((acc, match) => {
        if (!acc[match.filePath]) acc[match.filePath] = [];
        acc[match.filePath].push(match);
        return acc;
    }, {});

    const fileCount = Object.keys(byFile).length;

    return (
        <div className="glass rounded-2xl border border-border overflow-hidden">
            {/* Repo header */}
            <button
                type="button"
                onClick={() => setCollapsed((c) => !c)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-foreground/5 transition-colors text-left"
            >
                <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                    </svg>
                    <span className="font-semibold text-sm">{result.repoFullName}</span>
                    <span className="text-xs text-foreground/40">{fileCount} file{fileCount !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-xs font-semibold">
                        {result.matches.length} match{result.matches.length !== 1 ? "es" : ""}
                    </span>
                    <svg
                        className={`w-4 h-4 text-foreground/40 transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            {!collapsed && (
                <div className="divide-y divide-border border-t border-border">
                    {Object.entries(byFile).map(([filePath, matches]) => (
                        <FileResults key={filePath} filePath={filePath} matches={matches} query={query} />
                    ))}
                </div>
            )}
        </div>
    );
}
