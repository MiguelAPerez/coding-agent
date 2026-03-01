# Authentication and Permissions

This document outlines the architecture, setup, and maintenance of the custom Authentication and Permissions system in this application, built on top of [NextAuth.js (v4)](https://next-auth.js.org/) and [Drizzle ORM](https://orm.drizzle.team/).

## Architecture

**Stack:**

- **NextAuth.js**: Manages session state, JWT creation, and callbacks. Configured via the `CredentialsProvider` to support custom logins.
- **Drizzle ORM**: Type-safe database queries.
- **SQLite**: Underlying database system (`better-sqlite3`).

### Database Schema

The database relies on standard NextAuth models along with a custom implementation to support fine-grained permissions over simple roles.

- **`users`**: Contains base user properties (`name`, `username` (unique), `email`, `password` (hashed)).
- **`permissions`**: Defines granular access controls (e.g., `admin`, `users:read`, `settings:write`).
- **`user_permissions`**: A many-to-many join table securely mapping `users` to their assigned `permissions`.
- **NextAuth Defaults**: `accounts`, `sessions`, `verificationTokens` are maintained for standard Auth flows.

## Seeding the Database

We use a programmatic database seeder to ensure deterministic initialization of necessary records (like the default `admin` user and standard application `permissions`).

### Running the Seeder

To populate the database with required defaults, execute:

```bash
npm run db:seed
```

**What it does:**

1. **Initializes Permissions**: Idempotently inserts the base `name`/`description` pairs for app permissions.
2. **Creates Default Admin**: If an admin user does not exist, it creates one with the username `admin`, email `admin@example.com`, and a default password `password123`.
3. **Grants Access**: Explicitly ties the `admin` permission to the newly generated `admin` user via the `user_permissions` table.

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
