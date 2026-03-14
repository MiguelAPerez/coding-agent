"use client";

import React, { Suspense } from "react";
import { ErrorBanner } from "./components/ErrorBanner";
import { RepoChip } from "./components/RepoChip";
import { RepoResults } from "./components/RepoResults";
import { useSearch } from "./hooks/useSearch";

const COMMON_EXTENSIONS = [
    { label: "TypeScript", value: ".ts" },
    { label: "TSX", value: ".tsx" },
    { label: "JavaScript", value: ".js" },
    { label: "JSX", value: ".jsx" },
    { label: "Python", value: ".py" },
    { label: "Go", value: ".go" },
    { label: "Rust", value: ".rs" },
    { label: "Java", value: ".java" },
    { label: "C/C++", value: ".c" },
    { label: "C++", value: ".cpp" },
    { label: "Markdown", value: ".md" },
    { label: "JSON", value: ".json" },
    { label: "YAML", value: ".yaml" },
    { label: "Shell", value: ".sh" },
    { label: "HTML", value: ".html" },
    { label: "CSS", value: ".css" },
];

function SearchContent() {
    const {
        repos,
        selectedRepoIds,
        pattern,
        setPattern,
        reposCollapsed,
        setReposCollapsed,
        advancedOpen,
        setAdvancedOpen,
        searchMode,
        setSearchMode,
        caseSensitive,
        setCaseSensitive,
        wholeWord,
        setWholeWord,
        selectedExtensions,
        excludeInput,
        setExcludeInput,
        maxMatchesPerFile,
        setMaxMatchesPerFile,
        results,
        error,
        setError,
        isPending,
        inputRef,
        patternValid,
        toggleRepo,
        toggleAllRepos,
        toggleExtension,
        handleSearch
    } = useSearch();

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            if (!e.shiftKey || e.metaKey || e.ctrlKey) {
                e.preventDefault();
                handleSearch();
            }
        }
    };

    const totalMatches = results?.reduce((acc, r) => acc + r.matches.length, 0) ?? 0;

    return (
        <div className="max-w-6xl mx-auto px-4 py-10 space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">Code Search</h1>
                    <p className="text-foreground/50 text-sm">
                        {searchMode === "regex"
                            ? "Search across your repositories using regular expressions."
                            : "Explore your codebase using natural language semantic search."
                        }
                    </p>
                </div>

                <div className="flex bg-foreground/5 p-1 rounded-xl border border-border self-start md:self-auto">
                    <button
                        onClick={() => setSearchMode("regex")}
                        className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${searchMode === "regex"
                                ? "bg-white dark:bg-foreground/10 text-primary shadow-sm"
                                : "text-foreground/40 hover:text-foreground/60"
                            }`}
                    >
                        Regex
                    </button>
                    <button
                        onClick={() => setSearchMode("semantic")}
                        className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${searchMode === "semantic"
                                ? "bg-white dark:bg-foreground/10 text-primary shadow-sm"
                                : "text-foreground/40 hover:text-foreground/60"
                            }`}
                    >
                        Semantic
                    </button>
                </div>
            </div>

            <div className="glass rounded-2xl border border-border p-6 space-y-5">
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground/50 uppercase tracking-wider">
                        {searchMode === "regex" ? "Pattern" : "Concept"}
                        <span className="text-foreground/30 normal-case font-normal">
                            {searchMode === "regex" ? " (regex)" : " (natural language)"}
                        </span>
                    </label>
                    <div className="relative">
                        <input
                            ref={inputRef}
                            type="text"
                            value={pattern}
                            onChange={(e) => setPattern(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={searchMode === "regex" ? "e.g. useEffect\\(.*\\[\\]\\)" : "e.g. how does authentication work?"}
                            spellCheck={false}
                            autoComplete="off"
                            className={`w-full ${searchMode === "regex" ? "pl-8 pr-16" : "px-4"} py-3.5 rounded-xl border font-mono text-sm bg-foreground/5 placeholder:text-foreground/25 outline-none transition-all duration-150
                                ${patternValid || searchMode === "semantic"
                                    ? "border-border focus:border-primary/60 focus:bg-primary/5 focus:shadow-sm focus:shadow-primary/10"
                                    : "border-red-500/50 bg-red-500/5 focus:border-red-500/60"
                                }`}
                        />
                        {searchMode === "regex" && (
                            <>
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/30 font-mono text-sm select-none">/</div>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/30 font-mono text-sm select-none">/</div>
                            </>
                        )}

                        {!patternValid && (
                            <p className="absolute -bottom-5 left-0 text-xs text-red-400">Invalid regular expression</p>
                        )}
                    </div>
                </div>

                <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                        <button
                            type="button"
                            onClick={() => setReposCollapsed((c) => !c)}
                            className="flex items-center gap-1.5 text-xs font-semibold text-foreground/50 uppercase tracking-wider hover:text-foreground/80 transition-colors"
                        >
                            <svg
                                className={`w-3 h-3 transition-transform duration-200 ${reposCollapsed ? "-rotate-90" : ""}`}
                                fill="none" viewBox="0 0 24 24" stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                            </svg>
                            Repositories
                            {selectedRepoIds.length > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium normal-case">
                                    {selectedRepoIds.length}
                                </span>
                            )}
                        </button>
                        {!reposCollapsed && repos.length > 0 && (
                            <button
                                type="button"
                                onClick={toggleAllRepos}
                                className="text-xs text-foreground/40 hover:text-primary transition-colors"
                            >
                                {selectedRepoIds.length === repos.length ? "Deselect all" : "Select all"}
                            </button>
                        )}
                    </div>

                    {!reposCollapsed && (
                        repos.length === 0 ? (
                            <p className="text-sm text-foreground/40 py-2">No repositories found. Sync your repositories in the Admin settings.</p>
                        ) : (
                            <div className="flex flex-wrap gap-2 py-1">
                                {repos.map((repo) => (
                                    <RepoChip
                                        key={repo.id}
                                        repo={repo}
                                        selected={selectedRepoIds.includes(repo.id)}
                                        onToggle={() => toggleRepo(repo.id)}
                                    />
                                ))}
                            </div>
                        )
                    )}
                </div>

                <div className="border-t border-border pt-4">
                    <button
                        type="button"
                        onClick={() => setAdvancedOpen((o) => !o)}
                        className="flex items-center gap-2 text-sm text-foreground/50 hover:text-foreground transition-colors group"
                    >
                        <svg
                            className={`w-4 h-4 transition-transform duration-200 ${advancedOpen ? "rotate-90" : ""}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        Advanced Options
                        {(caseSensitive || wholeWord || selectedExtensions.length > 0) && (
                            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium">
                                {[caseSensitive && "case", wholeWord && "word", selectedExtensions.length > 0 && `${selectedExtensions.length} ext`].filter(Boolean).join(", ")}
                            </span>
                        )}
                    </button>

                    {advancedOpen && (
                        <div className="mt-4 space-y-5 animate-in fade-in slide-in-from-top-1 duration-150">
                            <div className="flex flex-wrap gap-3">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div className={`w-9 h-5 rounded-full relative transition-colors duration-200 ${caseSensitive ? "bg-primary" : "bg-foreground/15"}`}
                                        onClick={() => setCaseSensitive((v) => !v)}
                                    >
                                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200 ${caseSensitive ? "left-4" : "left-0.5"}`} />
                                    </div>
                                    <span className="text-sm text-foreground/70 group-hover:text-foreground transition-colors select-none">Case sensitive</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div className={`w-9 h-5 rounded-full relative transition-colors duration-200 ${wholeWord ? "bg-primary" : "bg-foreground/15"}`}
                                        onClick={() => setWholeWord((v) => !v)}
                                    >
                                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200 ${wholeWord ? "left-4" : "left-0.5"}`} />
                                    </div>
                                    <span className="text-sm text-foreground/70 group-hover:text-foreground transition-colors select-none">Whole word</span>
                                </label>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-foreground/40 uppercase tracking-wider">File Types</label>
                                <div className="flex flex-wrap gap-1.5">
                                    {COMMON_EXTENSIONS.map((ext) => (
                                        <button
                                            key={ext.value}
                                            type="button"
                                            onClick={() => toggleExtension(ext.value)}
                                            className={`px-2.5 py-1 rounded-lg border text-xs font-mono transition-all duration-150 ${selectedExtensions.includes(ext.value)
                                                    ? "bg-primary/15 border-primary/50 text-primary"
                                                    : "bg-foreground/5 border-border text-foreground/50 hover:border-foreground/30 hover:text-foreground/80"
                                                }`}
                                        >
                                            {ext.value}
                                        </button>
                                    ))}
                                </div>
                                {selectedExtensions.length === 0 && (
                                    <p className="text-xs text-foreground/35">No filter — all file types included</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground/40 uppercase tracking-wider">Exclude Paths</label>
                                <input
                                    type="text"
                                    value={excludeInput}
                                    onChange={(e) => setExcludeInput(e.target.value)}
                                    placeholder="node_modules, dist, .git"
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-foreground/5 text-sm font-mono placeholder:text-foreground/25 outline-none focus:border-primary/50 transition-colors"
                                />
                                <p className="text-xs text-foreground/35">Comma-separated directory/file names to skip</p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground/40 uppercase tracking-wider flex items-center justify-between">
                                    Max matches per file
                                    <span className="text-primary font-bold">{maxMatchesPerFile}</span>
                                </label>
                                <input
                                    type="range"
                                    min={5}
                                    max={200}
                                    step={5}
                                    value={maxMatchesPerFile}
                                    onChange={(e) => setMaxMatchesPerFile(Number(e.target.value))}
                                    className="w-full accent-primary"
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-3 pt-1">
                    {error && <ErrorBanner message={error} onClose={() => setError(null)} />}
                    <button
                        type="button"
                        onClick={handleSearch}
                        disabled={isPending || !patternValid || !pattern.trim()}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-medium text-sm transition-all duration-150 hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                    >
                        {isPending ? (
                            <>
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                </svg>
                                Searching…
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
                                </svg>
                                Search
                                <kbd className="hidden sm:inline-flex ml-1.5 h-5 select-none items-center gap-0.5 rounded border border-white/20 bg-white/10 px-1.5 font-sans text-[10px] font-medium text-white/70">
                                    <span className="text-[11px] leading-none">⌘</span>
                                    <span className="leading-none text-[9px] mt-[1px]">↵</span>
                                </kbd>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {results !== null && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <p className="text-sm text-foreground/50">
                            {totalMatches === 0
                                ? "No matches found."
                                : <><span className="font-semibold text-foreground">{totalMatches.toLocaleString()}</span> match{totalMatches !== 1 ? "es" : ""} across <span className="font-semibold text-foreground">{results.filter((r) => r.matches.length > 0).length}</span> repo{results.filter((r) => r.matches.length > 0).length !== 1 ? "s" : ""}</>
                            }
                        </p>
                        {totalMatches > 0 && (
                            <span className="text-xs text-foreground/30 font-mono">{pattern}</span>
                        )}
                    </div>

                    {results.filter((r) => r.matches.length > 0).map((result) => (
                        <RepoResults key={result.repoId} result={result} query={pattern} />
                    ))}

                    {totalMatches === 0 && (
                        <div className="glass rounded-2xl border border-border p-10 flex flex-col items-center gap-3 text-center">
                            <div className="w-12 h-12 rounded-full bg-foreground/5 flex items-center justify-center">
                                <svg className="w-6 h-6 text-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="font-medium text-foreground/60">No results</p>
                                <p className="text-sm text-foreground/35 mt-0.5">Try a different pattern or broaden your repo selection.</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function CodeSearchPage() {
    return (
        <Suspense fallback={<div className="max-w-6xl mx-auto px-4 py-10">Loading search...</div>}>
            <SearchContent />
        </Suspense>
    );
}
