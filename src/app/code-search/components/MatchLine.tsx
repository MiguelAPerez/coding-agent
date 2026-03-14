import React from "react";

export function MatchLine({ line, query, matchStart, matchEnd }: { line: string; query?: string; matchStart?: number; matchEnd?: number }) {
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
