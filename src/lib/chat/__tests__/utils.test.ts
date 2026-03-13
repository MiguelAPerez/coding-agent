import { parseDiffs, extractMentionedPaths } from "../utils";

describe("Chat Utils", () => {
    describe("extractMentionedPaths", () => {
        it("should extract paths mentioned with @", () => {
            const text = "Check @src/lib/utils.ts and @src/app/page.tsx";
            const paths = extractMentionedPaths(text);
            expect(paths).toEqual(["src/lib/utils.ts", "src/app/page.tsx"]);
        });

        it("should return unique paths", () => {
            const text = "Check @file.ts and @file.ts";
            const paths = extractMentionedPaths(text);
            expect(paths).toEqual(["file.ts"]);
        });

        it("should not extract structured terminal mentions as file paths", () => {
            const text = "Check @[TerminalName: node, ProcessId: 28934] and @src/app/page.tsx";
            const paths = extractMentionedPaths(text);
            expect(paths).toEqual(["src/app/page.tsx"]);
        });
    });

    describe("parseDiffs", () => {
        const fileContents = {
            "test.ts": "original content"
        };

        it("should parse file changes with START/END markers", () => {
            const content = `
Thoughts...
[INTERNAL_FILE_CHANGE_START: test.ts]
\`\`\`
new content
\`\`\`
[INTERNAL_FILE_CHANGE_END: test.ts]
Summary...
`;
            const { suggestion, cleanContent } = parseDiffs(content, "test.ts", fileContents);
            expect(suggestion.filesChanged["test.ts"].suggestedContent).toBe("new content");
            expect(suggestion.filesChanged["test.ts"].originalContent).toBe("original content");
            expect(cleanContent).toContain("Thoughts...");
            expect(cleanContent).toContain("Summary...");
            expect(cleanContent).not.toContain("[INTERNAL_FILE_CHANGE_START: test.ts]");
        });

        it("should fallback to loose regex if markers are missing", () => {
            const content = `
Check @test.ts
\`\`\`
loose content
\`\`\`
`;
            const { suggestion } = parseDiffs(content, "test.ts", fileContents);
            expect(suggestion.filesChanged["test.ts"].suggestedContent).toBe("loose content");
        });

        it("should handle orphan code block for active file", () => {
            const content = `
\`\`\`
orphan content
\`\`\`
`;
            const { suggestion } = parseDiffs(content, "test.ts", fileContents);
            expect(suggestion.filesChanged["test.ts"].suggestedContent).toBe("orphan content");
        });
    });
});
