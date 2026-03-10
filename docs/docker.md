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
