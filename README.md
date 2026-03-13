# Coding Agent

A simple repository manager for your coding projects. Its used to make quick updates or submit simple reviews for your pull requests. Its focused
around self-hosted tools and AI models.

<!-- jest_coverage_badge_start -->
![Coverage Total](https://img.shields.io/badge/Coverage-40.36%25-red)
<!-- jest_coverage_badge_end -->

## Features

- [x] [Safe Git Operations](docs/docker.md#safe-git-operations-sandbox) (via Docker Sandbox)
- [x] [Repository Management](https://github.com/MiguelAPerez/coding-agent/issues/3) (create, read, update)
- [x] [Code Lookup](https://github.com/MiguelAPerez/coding-agent/issues/5)
- [ ] [Code Review](https://github.com/MiguelAPerez/coding-agent/issues/4) (based on skills and context)
- [ ] [Code Update](https://github.com/MiguelAPerez/coding-agent/issues/6)
- [ ] [Code Generation](https://github.com/MiguelAPerez/coding-agent/issues/7)
- [x] [Prompt & Model Evaluation](https://github.com/MiguelAPerez/coding-agent/issues/8)
- [ ] [Documentation Lookup](https://github.com/MiguelAPerez/coding-agent/issues/9)

## Tools

- Docker (Safe Git Operations & Sandboxing)
- Ollama (AI Models)
- Gitea (Repository Management)
- SQLite (Database)

## Usage

You can run the `ghcr.io/miguelaperez/coding-agent` image with docker:

```bash
docker run -it --rm \
    -v $DATASTORE:/app/data \
    -p 3000:3000 \
    ghcr.io/miguelaperez/coding-agent:latest
```

Enviorment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| DATABASE_URL | Path to the database file. | `./data/sqlite.db` |
| NEXTAUTH_URL | URL of the application. | `http://localhost:3000` |
| NEXTAUTH_SECRET | Secret key for NextAuth. | `super-secret-key-change-me` |

or run with `--env-file`

```bash
cp .env.example .env
```

Once started login and set your configurations: `http://localhost:3000`
By default the username/password is `admin/admin`

## Contribution

To learn more about this project see [README.md](./docs/README.md)

## License

[PolyForm Noncommercial 1.0.0](LICENSE) - This is a **Source Available** license that allows for non-commercial use, modification, and sharing, but strictly prohibits commercial use (selling).
