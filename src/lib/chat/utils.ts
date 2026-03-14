import { FileChange, PendingSuggestion, TechnicalPlan } from "./types";

export function extractMentionedPaths(text: string): string[] {
    const paths: string[] = [];
    // Matches @path but excludes @[... structured mentions
    // We want to exclude trailing punctuation like , . ! ? : ; from the capture group
    const mentionRegex = /@(?!!\[)([^\s\n\`\[\]]+?)(?=[,.!?:;]?(\s|\n|$)|$)/g;
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
        paths.push(match[1]);
    }
    return Array.from(new Set(paths));
}

export function parseDiffs(content: string, activeFilePath: string | null, fileContents: Record<string, string>): { suggestion: PendingSuggestion, cleanContent: string } {
    const filesChanged: Record<string, FileChange> = {};
    let cleanContent = content;

    // 1. Primary: START/END markers (Robust Split and Conquer)
    const startRegex = /(?:\*\*|)\s*\[INTERNAL_FILE_CHANGE_START:\s*([^\s\]\n]+)\]\s*(?:\*\*|)/gi;
    
    const matches: { index: number, length: number, path: string }[] = [];
    let m;
    while ((m = startRegex.exec(content)) !== null) {
        matches.push({
            index: m.index,
            length: m[0].length,
            path: m[1]
        });
    }

    const blocksToRemove: { start: number, end: number }[] = [];

    for (let i = 0; i < matches.length; i++) {
        const current = matches[i];
        const next = matches[i + 1];
        
        const blockEnd = next ? next.index : content.length;
        
        const escapedPath = current.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const endRegex = new RegExp(`(?:\\*\\*|)\\s*\\[INTERNAL_FILE_CHANGE_END:\\s*${escapedPath}\\]\\s*(?:\\*\\*|)`, 'i');
        const endMatch = endRegex.exec(content.substring(current.index, blockEnd));
        
        let contentEnd = blockEnd;
        if (endMatch) {
            contentEnd = current.index + endMatch.index + endMatch[0].length;
        }
        
        const fileContentBlock = content.substring(current.index, contentEnd);
        
        // Find the outermost code block in this marker group
        const firstTick = fileContentBlock.indexOf("```");
        const lastTick = fileContentBlock.lastIndexOf("```");

        if (firstTick !== -1 && lastTick !== -1 && firstTick !== lastTick) {
            // Find the newline after the first ticks to skip optional language identifier
            const firstNewline = fileContentBlock.indexOf("\n", firstTick);
            const contentStart = firstNewline !== -1 ? firstNewline + 1 : firstTick + 3;
            
            filesChanged[current.path] = {
                startLine: 0,
                endLine: 0,
                column: 0,
                originalContent: fileContents[current.path] || "",
                suggestedContent: fileContentBlock.substring(contentStart, lastTick).trim()
            };
            blocksToRemove.push({ start: current.index, end: contentEnd });
        }
    }

    blocksToRemove.sort((a, b) => b.start - a.start);
    for (const b of blocksToRemove) {
        cleanContent = cleanContent.substring(0, b.start) + cleanContent.substring(b.end);
    }

    // 2. Fallback: Search for @path, FILE: path, or path in a header followed by a code block
    // Supports @path, @`path`, FILE: path, ### 1. Update path, etc.
    // Allow closing backticks to be optional if at the end of content
    const looseRegex = /(?:@|FILE:\s*|###\s*(?:[\w\s]*?[:])?\s*(?:Update|Update\s*file|File|Full|Revised|Complete|Final|Path|Suggested|)\s*)(?:`|)([^`\s\n\[\]]+)(?:`|)[^`]{0,500}```(?:[\w-]*)?\n([\s\S]*?)(?:\n```|$(?![\s\S]))/gi;
    
    // Create a map to track all variations and pick the best
    const candidates: Record<string, string[]> = {};

    let match;
    const knownPaths = Object.keys(fileContents);

    while ((match = looseRegex.exec(cleanContent)) !== null) {
        const [, path, code] = match;
        const cleanPath = path
            .replace(/^@/, '')
            .replace(/`/g, '')
            .replace(/[.,:;!?]+$/, '')
            .trim();
        
        // Fuzzy Resolution: Find if this path matches a known path suffix
        // e.g. "ai.yml" matches "infrastructure/components/ai.yml"
        let resolvedPath = cleanPath;
        if (!fileContents[cleanPath]) {
            const bestMatch = knownPaths.find(kp => 
                kp === cleanPath || 
                kp.endsWith('/' + cleanPath) || 
                kp.endsWith('\\' + cleanPath)
            );
            if (bestMatch) resolvedPath = bestMatch;
        }

        if (!candidates[resolvedPath]) candidates[resolvedPath] = [];
        candidates[resolvedPath].push(code.trim());
    }

    // Apply the best candidate for each file
    for (const [path, codes] of Object.entries(candidates)) {
        if (!filesChanged[path]) {
            const original = fileContents[path] || "";
            
            // Selection strategy:
            // 1. Separate codes into those that change the file and those that don't
            const withChanges = codes.filter(c => c !== original.trim());
            const withoutChanges = codes.filter(c => c === original.trim());

            // 2. Prefer blocks with changes. If multiple, pick the longest.
            // This avoids "lazy" models providing the original file as the "longest" block 
            // while providing a snippet with changes as a "shorter" block.
            let best;
            if (withChanges.length > 0) {
                best = withChanges.sort((a, b) => b.length - a.length)[0];
            } else {
                best = withoutChanges.sort((a, b) => b.length - a.length)[0];
            }

            filesChanged[path] = {
                startLine: 0,
                endLine: 0,
                column: 0,
                originalContent: original,
                suggestedContent: best
            };
        }
    }

    // Clean up the text by removing all matches we processed
    cleanContent = cleanContent.replace(looseRegex, "");

    // 3. Last Resort: Orphan code block for active file
    // Use the absolute outermost backticks for the orphan block
    if (Object.keys(filesChanged).length === 0 && activeFilePath) {
        const firstTick = cleanContent.indexOf("```");
        const lastTick = cleanContent.lastIndexOf("```");
        
        if (firstTick !== -1 && lastTick !== -1 && firstTick !== lastTick) {
            const firstNewline = cleanContent.indexOf("\n", firstTick);
            const contentStart = firstNewline !== -1 ? firstNewline + 1 : firstTick + 3;
            
            filesChanged[activeFilePath] = {
                startLine: 0,
                endLine: 0,
                column: 0,
                originalContent: fileContents[activeFilePath] || "",
                suggestedContent: cleanContent.substring(contentStart, lastTick).trim()
            };
            cleanContent = cleanContent.substring(0, firstTick) + cleanContent.substring(lastTick + 3);
        }
    }

    cleanContent = cleanContent.replace(/(?:\*\*|)\s*\[INTERNAL_FILE_CHANGE(?:_START|_END|):?\s*[^\s\]\n]*\]\s*(?:\*\*|)/gi, '');
    cleanContent = cleanContent.replace(/(?:FILE|FILE_CHANGE|PATH):\s*[^\s\n]+/gi, '');
    
    cleanContent = cleanContent.trim();
    cleanContent = cleanContent.replace(/^(?:\s*[-*_]{3,}\s*\n+)+/, '');
    cleanContent = cleanContent.replace(/(?:\n+\s*[-*_]{3,}\s*)+$/, '');
    cleanContent = cleanContent.replace(/\n\s*[-*_]{3,}\s*\n/g, '\n\n');

    return {
        suggestion: {
            chatId: Date.now(),
            messages: [],
            filesChanged
        },
        cleanContent: cleanContent.trim().replace(/\n{3,}/g, '\n\n')
    };
}

export function parseTechnicalPlan(content: string): TechnicalPlan | null {
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*"steps"[\s\S]*\}/);
    if (!jsonMatch) return null;
    
    let jsonStr = jsonMatch[0];
    if (jsonMatch[1]) jsonStr = jsonMatch[1];

    try {
        const plan = JSON.parse(jsonStr);
        if (plan.steps && Array.isArray(plan.steps)) {
            return {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            steps: plan.steps.map((s: any) => ({
                    file: s.file || s.path,
                    action: s.action || "modify",
                    rationale: s.rationale || s.description || "",
                    status: "pending"
                }))
            };
        }
    } catch (e) {
        console.error("Failed to parse technical plan", e);
    }
    return null;
}
