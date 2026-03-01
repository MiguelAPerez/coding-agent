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

## Running Locally

```bash
npm install
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).
