# Coding Agent

A simple repository manager for your coding projects. Its used to make quick updates or submit simple reviews for your pull requests. Its focused
around self-hosted tools and AI models.

![Coverage Lines](https://img.shields.io/badge/Coverage-Lines-5.75%25-red)
![Coverage Statements](https://img.shields.io/badge/Coverage-Statements-5.67%25-red)
![Coverage Branches](https://img.shields.io/badge/Coverage-Branches-7.4%25-red)
![Coverage Functions](https://img.shields.io/badge/Coverage-Functions-6.7%25-red)

<!-- jest_coverage_badge_start -->
<!-- jest_coverage_badge_end -->

## Features

- [Repository Management](https://github.com/MiguelAPerez/coding-agent/issues/3) (create, read, update)
- [Code Lookup](https://github.com/MiguelAPerez/coding-agent/issues/5)
- [Code Review](https://github.com/MiguelAPerez/coding-agent/issues/4) (based on skills and context)
- [Code Update](https://github.com/MiguelAPerez/coding-agent/issues/6)
- [Code Generation](https://github.com/MiguelAPerez/coding-agent/issues/7)
- [Prompt & Model Evaluation](https://github.com/MiguelAPerez/coding-agent/issues/8)
- [Documentation Lookup](https://github.com/MiguelAPerez/coding-agent/issues/9)

## Tools

- Ollama (AI Models)
- Gitea (Repository Management)
- SQLite (Database)

## Usage

Start container:

```bash
docker run -it --rm \
    -v $DATASTORE:/data \
    -v $DATABASE:/sqlite.db \
    -p 3000:3000 \
    coding-agent
```

Once started login and set your configurations: `http://localhost:3000`
By default the username/password is `admin/admin`

## Contribution

To learn more about this project see [README.md](./docs/README.md)

## License

[PolyForm Noncommercial 1.0.0](LICENSE) - This is a **Source Available** license that allows for non-commercial use, modification, and sharing, but strictly prohibits commercial use (selling).
