# Database and ORM

This document covers the implementation details of the database layer using [Drizzle ORM](https://orm.drizzle.team/) with SQLite (`better-sqlite3`).

## Architecture

- **Drizzle ORM**: Provides type-safe database queries.
- **SQLite**: Underlying local development database system.
- **Schema**: Defined entirely in `db/schema.ts`.

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
2. **Creates Default Admin**: If an admin user does not exist, it creates one with the username `admin`, email `admin@example.com`, and a default password configured in the script.
3. **Grants Access**: Explicitly ties the `admin` permission to the newly generated `admin` user via the `user_permissions` table.

## Clearing the Database

If you need to clear your local database and start fresh (e.g., to wipe all users, sessions, or reset permissions):

### Option 1: Using the Clear Script (Recommended)

To delete all records from all tables while keeping the schema intact:

```bash
npm run db:clear
```

After clearing, you can re-seed the default data:

```bash
npm run db:seed
```

### Option 2: Manual Reset

If you encounter issues with the schema itself and want a total reset:

1. **Delete the database file**: Remove `sqlite.db` from the root of the project.
2. **Push the schema**: Recreate the database structure.

   ```bash
   npx drizzle-kit push
   ```

3. **Re-seed**: Populate the new, empty database.

   ```bash
   npm run db:seed
   ```
