import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import * as schema from './schema';
import { dataDir } from '../paths';

export type Db = BetterSQLite3Database<typeof schema> & { $client: Database.Database };

export const MIGRATIONS_DIR = path.resolve(process.cwd(), 'drizzle');

/**
 * Opens (or creates) a SQLite file and applies any pending migrations.
 * Pass ':memory:' for a throwaway database in tests.
 */
export function openDb(file: string, migrationsFolder = MIGRATIONS_DIR): Db {
	if (file !== ':memory:') mkdirSync(path.dirname(file), { recursive: true });
	const client = new Database(file);
	// WAL lets the app read while a write is in progress and survives power loss well.
	client.pragma('journal_mode = WAL');
	client.pragma('foreign_keys = ON');
	const db = drizzle({ client, schema });
	migrate(db, { migrationsFolder });
	return db;
}

let shared: Db | undefined;

/** The app's database, opened on first use so builds never touch the file. */
export function getDb(): Db {
	shared ??= openDb(path.join(dataDir(), 'cellar.db'));
	return shared;
}

export { schema };
