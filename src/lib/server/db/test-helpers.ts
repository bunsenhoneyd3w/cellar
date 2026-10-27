import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { openDb, MIGRATIONS_DIR, type Db } from './index';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

/** A fresh in-memory database with every migration applied. */
export function testDb(): Db {
	return openDb(':memory:');
}

type Journal = { entries: { idx: number; tag: string }[] };

/**
 * A copy of the migrations folder that stops after the first `count` files,
 * so a test can build a database the way an older version of the app left it.
 */
export function migrationsUpTo(count: number): string {
	const dir = mkdtempSync(path.join(tmpdir(), 'cellar-migrations-'));
	cpSync(MIGRATIONS_DIR, dir, { recursive: true });
	const journalPath = path.join(dir, 'meta', '_journal.json');
	const journal: Journal = JSON.parse(readFileSync(journalPath, 'utf8'));
	journal.entries = journal.entries.slice(0, count);
	writeFileSync(journalPath, JSON.stringify(journal));
	return dir;
}

export function migrationCount(): number {
	const journal: Journal = JSON.parse(
		readFileSync(path.join(MIGRATIONS_DIR, 'meta', '_journal.json'), 'utf8')
	);
	return journal.entries.length;
}

export function migrateToLatest(db: Db) {
	migrate(db, { migrationsFolder: MIGRATIONS_DIR });
}
