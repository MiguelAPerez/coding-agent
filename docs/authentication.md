# Authentication and Permissions

This document outlines the architecture, setup, and maintenance of the custom Authentication and Permissions system in this application, built on top of [NextAuth.js (v4)](https://next-auth.js.org/) and [Drizzle ORM](https://orm.drizzle.team/).

## Architecture

**Stack:**

- **NextAuth.js**: Manages session state, JWT creation, and callbacks. Configured via the `CredentialsProvider` to support custom logins.
- **Drizzle ORM**: Type-safe database queries.
- **SQLite**: Underlying database system (`better-sqlite3`).

### Database Schema

The database relies on models defined in `db/schema.ts`. For a detailed breakdown of the schema, database seeding, and how to clear the database, please refer to the [Database and ORM Documentation](./orm.md).

## Accessing Permissions In-App

The system eagerly fetches a user's permissions directly during the NextAuth login callback.

Because the JWT and Session callbacks are customized, the user's explicit permissions are heavily typed and globally accessible. Rather than fetching from the database inside a React component, you simply read the Session object.

```tsx
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";

export default async function ProtectedPage() {
    const session = await getServerSession(authOptions);
    
    // session.user.permissions is an array of strings (e.g. ["admin", "users:read"])
    if (!session?.user?.permissions?.includes('admin')) {
        return <div>Access Denied</div>;
    }

    return <div>Admin Portal</div>;
}
```

## Adding New Permissions

When adding new secure features to the application:

1. Add the new permission literal (e.g., `posts:delete`) to the `DEFAULT_PERMISSIONS` array inside `db/seed.ts`.
2. Re-run `npm run db:seed` to insert it into your local/production database.
3. Grant it to relevant users or modify the seeder to conditionally grant it on initialization.
