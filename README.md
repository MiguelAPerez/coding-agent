# Coding Agent

A simple repository manager for your coding projects. Its used to make quick updates or submit simple reviews for your pull requests. Its focused
around self-hosted tools and AI models.

## Features

- [ ] Repository Management (create, read, update)
- [ ] Code Review (based on skills and context)
- [ ] Code Lookup
- [ ] Code Update
- [ ] Code Generation
- [ ] Prompt&Model Evaluation
- [ ] Documentation Lookup

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
    coding-agent
```

Once started login and set your configurations: `http://localhost:8000`
By default the username/password is `admin/admin`

## Contribution

To learn more about this project see [README.md](./docs/README.md)

## License

[PolyForm Noncommercial 1.0.0](LICENSE) - This is a **Source Available** license that allows for non-commercial use, modification, and sharing, but strictly prohibits commercial use (selling).
