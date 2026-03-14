# CodeWarden

Is a platform designed to help you manage your codebases

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS integration with a premium dark mode, glassmorphism utilities, and rich visual aesthetics.
- **Typography**: [Outfit](https://fonts.google.com/specimen/Outfit) via `next/font`.

## Architecture

- `data/`: Contains the database and other data used by the app.
  - `{userId}` - Each user has their own directory containing their data.
    - `workspaces` - Each workspace has its own directory containing its data.
    - `repos` - Each repo has its own directory containing its data.
    - `agents` - Each agent has its own directory containing its data.
  - `templates` - Holds starter templates for agents and system prompts.
    - `agent` - Agent templates
      - `PERSONALITY.md` - How the agent responses
      - `WORKFLOW.md` - How the agent works (rules to follow)
      - `IDENTITY.md` - Who the agent is
  - `system`
    - `DOCUMENTATION.md` - How the agent responds to documentation requests
    - `CODER.md` - How the agent responds to coding requests
    - `REVIEWER.md` - How the agent responds to code review requests
    - `BASE_FORMAT.md` - How the agent formats its responses (our panel compoent generates the UI)
  - `skills` - The skills the agent has
    - `{name}`
      - `SKILL.md` - Description of the skill
      - `main.ts` - Code the skill can execute
  - `sqlite.db`
- `src/app/`: Contains the main application routes.
  - `page.tsx`: The landing page showcasing premium design elements.
  - `layout.tsx`: Root layout managing the HTML document, injecting the Outfit font, and providing dark mode context.
  - `globals.css`: Tailwind configuration and custom CSS variables for themes.
  - `api/`: API routes for backend logic. (async)
  - `actions/`: Actions for backend logic (syncronous)
  - `components/`: Reusable components for the whole app
  - `{page_name}/`: Top level pages
    - `components/`: Reusable components for the page
    - `page.tsx`: Page content
- `system-statics` - Contains the system prompts and templates for the agents and data system
  - `system-prompts` - Contains the system prompts for the project (DOCUMENTATION.md, CODER.md, REVIEWER.md, BASE_FORMAT.md)
  - `templates` - Contains the templates for the agents or other features
    - `agent` - Agent templates (PERSONALITY.md, WORKFLOW.md, IDENTITY.md)
- `docs/`: Comprehensive project documentation.
  - [authentication](authentication.md): Details the NextAuth permissions.
  - [orm](orm.md): Details the Drizzle database schema, seeder process, and DB clearing instructions.
  - [context-groups](context-groups.md): Explains the benchmarking evaluation system and test case structures.
  - [docs-chat](docs-chat.md): Explains the DocsChat architecture and document parsing layout.
  - [background-jobs](background-jobs.md): Instructions on how to add and manage scheduled cron tasks.
  - [workspaces](workspaces.md): A place to pair program and make quick modifications

## Chat

```
[PERSONALITY]
[IDENTITY]
[WORKFLOW]
[SKILLS]
[TOOLS]
[CONTEXT]
[WORKMODE]
```

- `PERSONALITY.md` - How the agent responses
- `IDENTITY.md` - Who the agent is
- `WORKFLOW.md` - How the agent works (rules to follow)
- `CONTEXT` - What the agent is working on
- `WORKMODE` - `CODER` or `DOCUMENTATION` or `REVIEWER` used to put the agent in a mode

## Development

To start developemnt start with the [Development](development.md) section.
