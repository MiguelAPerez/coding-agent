# Workspaces in Coding Agent

## Purpose

The Coding Agent uses a dual-directory system for handling repositories to ensure that system-wide analysis processes don't interfere with individual user edits.

### `data/repos/<userId>/`

This is the **read-only source of truth** for the system, isolated by user. Repositories cloned here are used by the system for:

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

## Git Operations & Sandboxing

Workspaces are full Git repositories. The application leverages Docker to ensure all write-heavy git operations occur in a safe, isolated environment.

- **Committing / Pushing**: (Implemented) Users can commit changes and push back to remotes. These commands are proxied through a specialized Docker sandbox to prevent host pollution.
- **Development Sandboxes**: Users can group multiple workspaces into a single persistent Docker container for focused development.
- **Diffing**: The chat panel uses `git diff` in the workspace to track AI-suggested changes vs. user modifications.
