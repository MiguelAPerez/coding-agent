"use client";

import React, { useState, useCallback, useTransition, useEffect, useMemo, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { searchCode, RepoSearchResult } from "@/app/actions/search";
import { semanticSearch } from "@/app/actions/semantic-search";
import { getCachedRepositories } from "@/app/actions/repositories";

type Repo = {
    id: string;
    name: string;
    fullName: string;
    language: string | null;
    enabled: boolean;
    updatedAt: number;
};

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

function ErrorBanner({ message, onClose }: { message: string; onClose: () => void }) {
    return (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="flex-1">{message}</span>
            <button onClick={onClose} className="opacity-70 hover:opacity-100 transition-opacity">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
}

function MatchLine({ line, query, matchStart, matchEnd }: { line: string; query?: string; matchStart?: number; matchEnd?: number }) {
    if (query && (!matchStart || !matchEnd || matchStart === matchEnd)) {
        // Multi-word highlight (Semantic mode or fallback)
        const words = query
            .replace(/([a-z])([A-Z])/g, "$1 $2")
            .split(/[^a-zA-Z0-9]/)
            .filter(w => w.length >= 3);
        
        if (words.length === 0) return <span>{line}</span>;
        
        // Escape and create flexible regex (allows underscores/dashes between letters)
        const flexible = words.map(w => 
            w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
             .split("")
             .join("[^a-zA-Z0-9]*")
        );
        const regex = new RegExp(`(${flexible.join("|")})`, "gi");
        const parts = line.split(regex);
        
        return (
            <span>
                {parts.map((part, i) => 
                    regex.test(part) 
                        ? <mark key={i} className="bg-primary/25 text-primary rounded px-0.5 font-semibold not-italic">{part}</mark>
                        : <span key={i} className="text-foreground/70">{part}</span>
                )}
            </span>
        );
    }

    const start = matchStart ?? 0;
    const end = matchEnd ?? 0;
    const before = line.slice(0, start);
    const match = line.slice(start, end);
    const after = line.slice(end);
    
    return (
        <span>
            <span className="text-foreground/60">{before}</span>
            <mark className="bg-primary/25 text-primary rounded px-0.5 font-semibold not-italic">{match}</mark>
            <span className="text-foreground/60">{after}</span>
        </span>
    );
}

function RepoChip({ repo, selected, onToggle }: { repo: Repo; selected: boolean; onToggle: () => void }) {
    const isDisabled = repo.enabled === false;
    return (
        <button
            type="button"
            onClick={isDisabled ? undefined : onToggle}
            disabled={isDisabled}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-150 ${isDisabled
                    ? "opacity-40 grayscale cursor-not-allowed bg-foreground/5 border-border text-foreground/40"
                    : selected
                        ? "bg-primary/15 border-primary/50 text-primary shadow-sm shadow-primary/10"
                        : "bg-foreground/5 border-border text-foreground/50 hover:border-foreground/30 hover:text-foreground/70"
                }`}
            title={isDisabled ? "Repository is disabled" : undefined}
        >
            <div className={`w-1.5 h-1.5 rounded-full ${isDisabled ? "bg-foreground/20" : selected ? "bg-primary" : "bg-foreground/30"}`} />
            {repo.name}
            {isDisabled && <span className="text-[10px] ml-0.5 opacity-60">(off)</span>}
        </button>
    );
}

function SearchContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [repos, setRepos] = useState<Repo[]>([]);
    const [selectedRepoIds, setSelectedRepoIds] = useState<string[]>([]);
    const [pattern, setPattern] = useState(() => searchParams.get("q") ?? "");
    const [reposCollapsed, setReposCollapsed] = useState(false);
    const [advancedOpen, setAdvancedOpen] = useState(() => {
        return !!(
            searchParams.get("case") ||
            searchParams.get("word") ||
            searchParams.getAll("ext").length > 0 ||
            searchParams.get("exclude") ||
            searchParams.get("max")
        );
    });
    const [searchMode, setSearchMode] = useState<"regex" | "semantic">(() => {
        const mode = searchParams.get("mode");
        return (mode === "semantic" ? "semantic" : "regex") as "regex" | "semantic";
    });
    const [caseSensitive, setCaseSensitive] = useState(() => searchParams.get("case") === "1");
    const [wholeWord, setWholeWord] = useState(() => searchParams.get("word") === "1");
    const [selectedExtensions, setSelectedExtensions] = useState<string[]>(() => searchParams.getAll("ext"));
    const [excludeInput, setExcludeInput] = useState(() => searchParams.get("exclude") ?? "node_modules, .git, dist, build, .next");
    const [maxMatchesPerFile, setMaxMatchesPerFile] = useState(() => {
        const m = searchParams.get("max");
        return m ? Number(m) : 50;
    });
    const [results, setResults] = useState<RepoSearchResult[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-focus on mount + handle cmd+k to focus
    useEffect(() => {
        inputRef.current?.focus();

        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                inputRef.current?.focus();
            }
        };

        window.addEventListener("keydown", handleGlobalKeyDown);
        return () => window.removeEventListener("keydown", handleGlobalKeyDown);
    }, []);

    // Derive regex validity without setState-in-effect
    const patternValid = useMemo(() => {
        if (!pattern) return true;
        try {
            new RegExp(pattern);
            return true;
        } catch {
            return false;
        }
    }, [pattern]);

    useEffect(() => {
        getCachedRepositories()
            .then((data) => {
                const mapped: Repo[] = data.map((r) => ({
                    id: r.id,
                    name: r.name,
                    fullName: r.fullName,
                    language: r.language ?? null,
                    enabled: r.enabled,
                    updatedAt: typeof r.updatedAt === 'string' ? new Date(r.updatedAt).getTime() : (r.updatedAt as Date).getTime(),
                }));

                const sorted = [...mapped].sort((a, b) => a.name.localeCompare(b.name));
                setRepos(sorted);

                // Restore selected repos from URL after repos are loaded
                const urlRepos = searchParams.getAll("repo");
                if (urlRepos.length > 0) {
                    const validIds = mapped.map((r) => r.id);
                    setSelectedRepoIds(urlRepos.filter((id) => validIds.includes(id)));
                } else {
                    // Auto-select top 5 *already enabled* repositories by updatedAt
                    const enabledRepos = mapped.filter(r => r.enabled);
                    const top5 = [...enabledRepos]
                        .sort((a, b) => b.updatedAt - a.updatedAt)
                        .slice(0, 5);
                    
                    const top5Ids = top5.map(r => r.id);
                    setSelectedRepoIds(top5Ids);
                }
            })
            .catch((err) => {
                console.error(err);
                setError("Failed to load repositories.");
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const toggleRepo = useCallback((id: string) => {
        setSelectedRepoIds((prev) =>
            prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
        );
    }, []);

    const toggleAllRepos = useCallback(() => {
        setSelectedRepoIds((prev) =>
            prev.length === repos.length ? [] : repos.map((r) => r.id)
        );
    }, [repos]);

    const toggleExtension = useCallback((ext: string) => {
        setSelectedExtensions((prev) =>
            prev.includes(ext) ? prev.filter((e) => e !== ext) : [...prev, ext]
        );
    }, []);

    const handleSearch = useCallback(() => {
        if (!pattern.trim() || !patternValid) return;
        if (selectedRepoIds.length === 0) {
            setError("Please select at least one repository to search.");
            return;
        }

        // Build URL encoding all options
        const params = new URLSearchParams();
        params.set("q", pattern);
        params.set("mode", searchMode);
        selectedRepoIds.forEach((id) => params.append("repo", id));
        if (searchMode === "regex") {
            if (caseSensitive) params.set("case", "1");
            if (wholeWord) params.set("word", "1");
            selectedExtensions.forEach((ext) => params.append("ext", ext));
            if (excludeInput !== "node_modules, .git, dist, build, .next") {
                params.set("exclude", excludeInput);
            }
            if (maxMatchesPerFile !== 50) params.set("max", String(maxMatchesPerFile));
        }
        router.push(`/code-search?${params.toString()}`, { scroll: false });

        setError(null);
        const excludePatterns = excludeInput
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

        startTransition(async () => {
            try {
                let res;
                if (searchMode === "regex") {
                    res = await searchCode({
                        repoIds: selectedRepoIds,
                        pattern,
                        caseSensitive,
                        wholeWord,
                        includeExtensions: selectedExtensions,
                        excludePatterns,
                        maxMatchesPerFile,
                    });
                } else {
                    res = await semanticSearch({
                        repoIds: selectedRepoIds,
                        query: pattern,
                        limit: 50,
                    });
                }
                setResults(res as RepoSearchResult[]);
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : "Search failed.");
            }
        });
    }, [pattern, patternValid, selectedRepoIds, searchMode, caseSensitive, wholeWord, selectedExtensions, excludeInput, maxMatchesPerFile, router]);

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
            {/* Search Header & Mode Toggle */}
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

                {/* Mode Selector */}
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

            {/* Main search card */}
            <div className="glass rounded-2xl border border-border p-6 space-y-5">
                {/* Regex input */}
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

                {/* Repo selection */}
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

                {/* Advanced section */}
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
                            {/* Match flags */}
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

                            {/* File extensions */}
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

                            {/* Exclude patterns */}
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

                            {/* Max matches per file */}
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

                {/* Search button + error */}
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

            {/* Results */}
            {results !== null && (
                <div className="space-y-4">
                    {/* Summary bar */}
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

                    {/* Per-repo results */}
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

function RepoResults({ result, query }: { result: RepoSearchResult; query: string }) {
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

function FileResults({ filePath, matches, query }: { filePath: string; matches: RepoSearchResult["matches"]; query: string }) {
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
