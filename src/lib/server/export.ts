import type { OpenDb } from './db';
import { ALL_TABLES } from './db/schema';

// Every table downloads as CSV and JSON (CLAUDE.md rule 2). Rows are read
// straight from SQLite so column names match the database file exactly.

export const TABLE_NAMES = Object.keys(ALL_TABLES) as (keyof typeof ALL_TABLES)[];
export type TableName = (typeof TABLE_NAMES)[number];

export function isTableName(name: string): name is TableName {
	return (TABLE_NAMES as string[]).includes(name);
}

type Row = Record<string, unknown>;

export function tableRows(db: OpenDb, name: TableName): Row[] {
	// The name is checked against the fixed list above, so it is safe to put in SQL.
	return db.$client.prepare(`select * from "${name}" order by rowid`).all() as Row[];
}

export function tableCounts(db: OpenDb): { name: TableName; count: number }[] {
	return TABLE_NAMES.map((name) => ({
		name,
		count: (db.$client.prepare(`select count(*) as n from "${name}"`).get() as { n: number }).n
	}));
}

/** JSON columns come back from SQLite as text; in a JSON export they become real objects. */
export function rowsForJson(rows: Row[]): Row[] {
	return rows.map((row) =>
		Object.fromEntries(
			Object.entries(row).map(([k, v]) => {
				if (k.endsWith('_json') && typeof v === 'string') {
					try {
						return [k, JSON.parse(v)];
					} catch {
						return [k, v];
					}
				}
				return [k, v];
			})
		)
	);
}

function csvCell(v: unknown): string {
	if (v === null || v === undefined) return '';
	const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
	return /[",\r\n]/.test(s) || /^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** RFC 4180 CSV with a header row. Columns come from the table even when it has no rows. */
export function toCsv(rows: Row[], columns?: string[]): string {
	const cols = columns ?? [...new Set(rows.flatMap((r) => Object.keys(r)))];
	const lines = [
		cols.map(csvCell).join(','),
		...rows.map((r) => cols.map((c) => csvCell(r[c])).join(','))
	];
	return lines.join('\r\n') + '\r\n';
}

export function tableColumns(db: OpenDb, name: TableName): string[] {
	return (db.$client.prepare(`pragma table_info("${name}")`).all() as { name: string }[]).map(
		(c) => c.name
	);
}
