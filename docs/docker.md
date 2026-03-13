# Docker Setup

This guide explains how to build and run the coding-agent application using Docker and Docker Compose. This setup is optimized for production-like environments and ensures persistence for the SQLite database.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

## Quick Start

To build and start the application, run:

```bash
docker-compose up --build
```

The application will be available at `http://localhost:3000`.

## Architecture

The Docker setup uses a multi-stage `Dockerfile` to produce a small, secure production image:

1. **Deps Stage**: Installs all required dependencies (including build tools for `better-sqlite3`).
2. **Builder Stage**: Builds the Next.js application using `npm run build`.
3. **Runner Stage**: A slim Alpine-based image that only contains the necessary code and the `node` runtime.

## Persistence

The `docker-compose.yml` file is configured to persist your data:

- **`.env`**: Mounted into the container so you can manage environment variables on your host.
- **`data/sqlite.db`**: The main database file is stored within the `data` volume to allow data to persist across container restarts.
- **`/data`**: The directory used for the database, repository analysis, and other assets is mounted.

## Environment Variables

Ensure your `.env` file contains the necessary secrets and configuration before running `docker-compose up`. Note that `NEXTAUTH_URL` should be set to your publicly accessible URL or `http://localhost:3000` if testing locally.

## Troubleshooting

- **Database Locks**: If you encounter SQLite database locks, ensure only one instance of the application (either inside or outside Docker) is accessing the `data/sqlite.db` file at a time.
- **Build Errors**: If the build fails during dependency installation, ensure you have sufficient disk space and a stable internet connection for downloading Alpine packages and npm dependencies.

## Safe Git Operations (Sandbox)

The coding agent provides an isolated environment for Git operations (commit, push, etc.) using temporary or persistent Docker containers.

### How it Works

When initialized, the application builds a specialized Ubuntu-based image (`coding-agent-git`). This image contains only `git`, `ssh`, and necessary certificates.

#### Technical Implementation

1. **Isolation**: Commands are run using `docker run --rm -v "host/path:/workspace"`. The container has no access to your host except for the specific repository directory.
2. **Persistence**: For long-running development, "Sandboxes" can be created. These containers stay active and can mount multiple repositories simultaneously.
3. **Labels**: Sandboxes are tracked using Docker labels (`app=coding-agent`, `sandbox-name`, `sandbox-repos`).
4. **Volume Mapping**:
   - Host: `/Users/.../data/workspaces/{user_id}/{org}/{repo}`
   - Container: `/workspace/{repo_name}`

### Managing Sandboxes

You can manage your sandboxes via **Settings > Docker Git Sandbox** or the **Dashboard**.

- **Setup**: One-click build of the sandbox image.
- **Create**: Select projects to include in a persistent dev environment.
- **Update**: Add or remove repositories from an active sandbox (triggers a stop-recreate cycle).
- **Stop**: Instantly kill the container and unmount volumes.
