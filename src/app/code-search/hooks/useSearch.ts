import { useState, useCallback, useTransition, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { searchCode, RepoSearchResult } from "@/app/actions/search";
import { semanticSearch } from "@/app/actions/semantic-search";
import { getCachedRepositories } from "@/app/actions/repositories";
import { Repo } from "../components/RepoChip";

export function useSearch() {
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

    // Derive regex validity
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
    }, [searchParams]);

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

    return {
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
    };
}
