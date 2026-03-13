import { parseDiffs } from "../utils";

describe("parseDiffs", () => {
    it("handles nested markdown code blocks correctly during file change extraction", () => {
        const content = `
I have updated the task list for you.

[INTERNAL_FILE_CHANGE_START: task.md]
\`\`\`markdown
# Current Tasks

- [x] Initial setup
- [x] Redux migration

\`\`\`js
console.log("Nested code block!");
\`\`\`

- [ ] Future work
\`\`\`
[INTERNAL_FILE_CHANGE_END: task.md]

Let me know if you need anything else.
`;
        const { suggestion } = parseDiffs(content, "task.md", {});
        
        expect(suggestion.filesChanged["task.md"]).toBeDefined();
        const suggestedContent = suggestion.filesChanged["task.md"].suggestedContent;
        
        // Ensure the entire content, including the nested JS block, is captured
        expect(suggestedContent).toContain("# Current Tasks");
        expect(suggestedContent).toContain('console.log("Nested code block!");');
        expect(suggestedContent).toContain("- [ ] Future work");
        
        // Ensure it didn't cut off at the first inner ```
        expect(suggestedContent.split("```").length).toBe(3); // One opening, one closing (of the nested block)
        // Wait, wait. 
        // The outer block is:
        // ```markdown
        // # Current Tasks
        // ...
        // - [ ] Future work
        // ```
        // So the number of ``` in the output should be 2 (the nested ones).
        // Let's check the count.
    });

    it("handles multiple file changes correctly", () => {
        const content = `
[INTERNAL_FILE_CHANGE_START: a.ts]
\`\`\`typescript
const a = 1;
\`\`\`
[INTERNAL_FILE_CHANGE_END: a.ts]

[INTERNAL_FILE_CHANGE_START: b.ts]
\`\`\`typescript
const b = 2;
\`\`\`
[INTERNAL_FILE_CHANGE_END: b.ts]
`;
        const { suggestion } = parseDiffs(content, null, {});
        expect(suggestion.filesChanged["a.ts"].suggestedContent).toBe("const a = 1;");
        expect(suggestion.filesChanged["b.ts"].suggestedContent).toBe("const b = 2;");
    });

    it("handles orphan code blocks for active file", () => {
        const content = "I updated the file:\n\n```js\nconst x = 10;\n```";
        const { suggestion } = parseDiffs(content, "active.ts", {});
        expect(suggestion.filesChanged["active.ts"].suggestedContent).toBe("const x = 10;");
    });
});
