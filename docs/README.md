# Next.js Application Overview

This project is a premium Next.js application bootstrapped with the `nextjs_app_scaffold` skill.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS integration with a premium dark mode, glassmorphism utilities, and rich visual aesthetics.
- **Typography**: [Outfit](https://fonts.google.com/specimen/Outfit) via `next/font`.

## Architecture

- `src/app/`: Contains the main application routes.
  - `page.tsx`: The landing page showcasing premium design elements.
  - `layout.tsx`: Root layout managing the HTML document, injecting the Outfit font, and providing dark mode context.
  - `globals.css`: Tailwind configuration and custom CSS variables for themes.
  - `api/`: API routes for backend logic.
- `docs/`: Comprehensive project documentation.
  - [authentication](authentication.md): Details the NextAuth permissions.
  - [orm](orm.md): Details the Drizzle database schema, seeder process, and DB clearing instructions.
  - [context-groups](context-groups.md): Explains the benchmarking evaluation system and test case structures.
  - [docs-chat](docs-chat.md): Explains the DocsChat architecture and document parsing layout.
  - [background-jobs](background-jobs.md): Instructions on how to add and manage scheduled cron tasks.
  - [workspaces](workspaces.md): A place to pair program and make quick modifications

## Running Locally

```bash
npm install
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).
