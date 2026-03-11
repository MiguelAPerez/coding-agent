# Workspaces in Coding Agent

## Purpose

The Coding Agent uses a dual-directory system for handling repositories to ensure that system-wide analysis processes don't interfere with individual user edits.

### `data/repos/`

This is the **read-only source of truth** for the system. Repositories cloned here are used by the system for:

- Markdown and source code analysis.
- Semantic search embeddings.
- RAG (Retrieval-Augmented Generation) context.
This directory should **never** be manually edited, and no code checkout/branch switching should happen here while an analysis is running.

### `data/workspaces/`

This directory is designed for **user modifications**.
When a user opens a repository in the IDE page (`/workspace`), a local clone of the repository is created in `data/workspaces/<userId>/<repoFullName>`.

Features of the workspace directory:

- **Per-User Isolation**: Each user gets their own copy of the repository. User A and User B can edit the same repository on different branches without conflicting with each other or the main analysis engine.
- **Git Backing**: The workspaces are full Git repositories. Branches can be checked out, and changes can be tracked using standard git commands (`git status`, `git checkout`).
- **Modifications**: All IDE file saves happen in this directory. The server actions in `src/app/actions/workspace.ts` ensure read/writes land in the correct `data/workspaces/` path.

## Future Extensions

- **Committing / Pushing**: Because workspaces are full git repos, future functionality can easily add options to commit changes and push PRs back to Gitea/GitHub.
- **Diffing**: The chat panel can run `git diff` in the workspace to see exactly what the AI or the user has modified before committing.
