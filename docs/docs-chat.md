# Docs Chat

The Docs Chat feature provides an interactive, 3-pane interface to explore and "chat" with markdown documentation from linked repositories.

## Layout & Architecture

The feature is built within `src/components/DocsChat` and integrated into the `src/app/docs-chat/page.tsx` route.

- **`DocsChatLayout.tsx`**: The main container component establishing a dynamic 3-pane flexbox interface. It manages state for the selected repository, selected file path, and whether the chat panel is active. It synchronizes state natively with the user's browser history via `window.history.pushState` and the `hashchange` browser event (e.g. `#doc=repo&page=file`).
- **`DocsSidebar.tsx`**: The left sidebar detailing loaded repositories and allowing the user to search through them. It features a collapsible directory tree constructed via `buildFileTree` to neatly organize `.md` and `.mdx` files.
- **`DocViewer.tsx`**: The main presentation layer. Initially, it acts as a landing hero with an AI chat prompt. When a file is selected, it leverages `react-markdown` to render the content natively.
  - It uses `@tailwindcss/typography` to elegantly style all `prose` (markdown structure like headers, quotes, lists).
  - It uses `react-syntax-highlighter` (with `vscDarkPlus` theme) to accurately stylize code blocks.
  - It integrates `mermaid.js` out-of-the-box to interpret `language-mermaid` custom code blocks and compile responsive architectural SVGs.
- **`ChatPanel.tsx`**: The third, slide-in pane activated during a chat session. Currently implements a mock conversational response simulating a documentation agent interaction.

## Server Actions Integration

To populate these documents without checking them directly into the codebase, we rely on custom server actions inside `src/app/actions/files.ts`:

- **`cloneOrUpdateRepository`**: Authenticates and performs a `git pull` or `git clone` of the remote origin directly to `data/repos/<userId>/`.
- **`getRepoMarkdownFiles`**: Recursively crawls the cloned repository skipping blocklists (like `.agent/` and `.git/`) to construct the file allowlist mapping shown in `DocsSidebar`.
- **`getRepoFileContent`**: Safely retrieves the source string representation of an end-user document for injection into the `DocViewer`.
