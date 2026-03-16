# Semantic Search

## Description

Performs semantic (natural language) search across the attached codebase to find relevant code snippets, functions, or documentation.

## Usage

To call this skill, use the skill invocation format with the skill ID `semantic-search`:

```json
{
  "skill": "semantic-search",
  "args": ["your search query here"]
}
```

- **args[0]** (required): The natural language search query.
- **args[1]** (optional): Maximum number of results to return (default: 10).

## Example

```json
{
  "skill": "semantic-search",
  "args": ["how is authentication handled", "5"]
}
```

## Notes

- Results will contain matching code chunks with file paths, line numbers, and similarity scores.
- Results are grouped by `repoName` and `repoFullName` — **always include the repository name** in your final answer.
- **Always cite the file path and repository** for each result you reference, e.g. `Documentation / src/components/AIChat/styles.module.css`.
