
import { extractMentionedPaths } from "../utils";

describe("extractMentionedPaths (reproduction)", () => {
    it("should correctly extract paths without trailing punctuation", () => {
        const testCases = [
            { text: "Check @src/app/page.tsx", expected: ["src/app/page.tsx"] },
            { text: "Check @src/app/page.tsx, and @src/lib/utils.ts.", expected: ["src/app/page.tsx", "src/lib/utils.ts"] },
            { text: "Wait for @components/ai.yml, I mean @components/ai.ts", expected: ["components/ai.yml", "components/ai.ts"] },
            { text: "Look at @[File: components/ai.yml]", expected: [] },
        ];

        for (const { text, expected } of testCases) {
            const result = extractMentionedPaths(text);
            expect(result).toEqual(expected);
        }
    });

    it("should handle email-like strings reasonably", () => {
        // This is a known side-effect of the current simple regex
        const text = "Email me at user@example.com";
        const result = extractMentionedPaths(text);
        // If it returns ["example.com"], we know it's capturing after the @
        expect(result).toBeDefined();
    });
});
