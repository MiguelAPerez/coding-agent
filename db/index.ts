import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'data', 'sqlite.db');

/**

 * Cache the database connection in a global variable to maintain a singleton
 * across Hot Module Replacement (HMR) during development.
 */
const globalForDb = global as unknown as {
  sqlite: Database.Database | undefined;
};

if (!globalForDb.sqlite) {
  if (process.env.NODE_ENV === 'test') {
    globalForDb.sqlite = new Database(':memory:');
  } else {
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    globalForDb.sqlite = new Database(dbPath);
  }
}

export const db = drizzle(globalForDb.sqlite);
