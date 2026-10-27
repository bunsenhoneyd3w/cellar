import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type { RunResult } from 'better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import * as schema from './schema';
import { dataDir } from '../paths';

/** The database or an open transaction; data functions accept either. */
export type Db = BaseSQLiteDatabase<'sync', RunResult, typeof schema>;
/** An opened database file, with the raw SQLite handle for pragmas and tests. */
export type OpenDb = Db & { $client: Database.Database };

export const MIGRATIONS_DIR = path.resolve(process.cwd(), 'drizzle');

/**
 * Opens (or creates) a SQLite file and applies any pending migrations.
 * Pass ':memory:' for a throwaway database in tests.
 */
export function openDb(file: string, migrationsFolder = MIGRATIONS_DIR): OpenDb {
	if (file !== ':memory:') mkdirSync(path.dirname(file), { recursive: true });
	const client = new Database(file);
	// WAL lets the app read while a write is in progress and survives power loss well.
	client.pragma('journal_mode = WAL');
	client.pragma('foreign_keys = ON');
	const db = drizzle({ client, schema });
	migrate(db, { migrationsFolder });
	return db;
}

let shared: OpenDb | undefined;

/** The app's database, opened on first use so builds never touch the file. */
export function getDb(): OpenDb {
	shared ??= openDb(path.join(dataDir(), 'cellar.db'));
	return shared;
}

export { schema };
