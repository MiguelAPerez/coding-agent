import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    schema: './db/schema/index.ts',
    out: './db/migrations',
    dialect: 'sqlite',
    dbCredentials: {
        url: 'file:data/sqlite.db',
    },
});
