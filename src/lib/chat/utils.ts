import { FileChange, PendingSuggestion } from "./types";

export function extractMentionedPaths(text: string): string[] {
    const paths: string[] = [];
    // Matches @path but excludes @[... structured mentions
    const mentionRegex = /@(?!!\[)([^\s\n\`\[\]]+)/g;
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

    // 2. Fallback: Search for @path or FILE: path followed by code block
    // Greedy match but scoped by potential start of next mention to avoid swallowing multiple files
    const looseRegex = /(?:@|FILE:\s*)([^\s\n\`\[\]]+)[^`]{0,150}```(?:[\w-]*)?\n([\s\S]*?)\n```(?=\s*(?:@|FILE:|\[INTERNAL|$))/gi;
    cleanContent = cleanContent.replace(looseRegex, (match, path, code) => {
        if (!filesChanged[path]) {
            filesChanged[path] = {
                startLine: 0,
                endLine: 0,
                column: 0,
                originalContent: fileContents[path] || "",
                suggestedContent: code.trim()
            };
            return ""; 
        }
        return match; 
    });

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
