import React, { useState } from "react";
import { RepoSearchResult } from "@/app/actions/search";
import { MatchLine } from "./MatchLine";

export function FileResults({ filePath, matches, query }: { filePath: string; matches: RepoSearchResult["matches"]; query: string }) {
    const [collapsed, setCollapsed] = useState(false);
    const parts = filePath.split("/");
    const fileName = parts.pop() ?? filePath;
    const dirName = parts.join("/");

    return (
        <div>
            <button
                type="button"
                onClick={() => setCollapsed((c) => !c)}
                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-foreground/5 transition-colors text-left"
            >
                <svg className="w-3.5 h-3.5 text-foreground/30 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-xs font-mono text-foreground/40">{dirName ? dirName + "/" : ""}</span>
                <span className="text-xs font-mono font-semibold text-foreground/80">{fileName}</span>
                <span className="ml-auto text-xs text-foreground/30">{matches.length}</span>
                <svg
                    className={`w-3 h-3 text-foreground/30 transition-transform duration-150 shrink-0 ${collapsed ? "-rotate-90" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {!collapsed && (
                <div className="bg-foreground/[0.02] font-mono text-xs">
                    {matches.map((match, i) => (
                        <div
                            key={i}
                            className="flex items-start gap-0 hover:bg-primary/5 transition-colors group"
                        >
                            <span className="w-12 text-right pr-4 py-2 pl-4 text-foreground/25 select-none border-r border-border shrink-0 group-hover:text-foreground/40 transition-colors">
                                {match.lineNumber}
                            </span>
                            <div className="flex-1 min-w-0">
                                <div className="px-4 pt-1 flex items-center gap-2">
                                    <span className={`text-[9px] font-bold uppercase tracking-tight px-1.5 py-0.5 rounded ${
                                        (match.similarity ?? 0) > 0.7 ? "bg-green-500/10 text-green-500" :
                                        (match.similarity ?? 0) > 0.5 ? "bg-blue-500/10 text-blue-500" :
                                        "bg-foreground/10 text-foreground/40"
                                    }`}>
                                        {Math.round((match.similarity ?? 0) * 100)}% match
                                    </span>
                                </div>
                                <pre className="px-4 pb-2 pt-1 whitespace-pre-wrap break-all text-foreground/70 leading-relaxed">
                                    <MatchLine
                                        line={match.lineContent}
                                        query={query}
                                        matchStart={match.matchStart}
                                        matchEnd={match.matchEnd}
                                    />
                                </pre>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
