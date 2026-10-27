import { error } from '@sveltejs/kit';
import { getDb } from '#lib/server/db/index.ts';
import {
	isTableName,
	rowsForJson,
	TABLE_NAMES,
	tableColumns,
	tableRows,
	toCsv
} from '#lib/server/export.ts';
import { nowIso } from '#lib/time.ts';
import type { RequestHandler } from './$types';

/** /settings/export/batch.csv, /settings/export/batch.json, or /settings/export/all.json */
export const GET: RequestHandler = ({ params }) => {
	const db = getDb();
	const match = /^([a-z_]+)\.(csv|json)$/.exec(params.file);
	if (!match) error(404, 'Unknown export');
	const [, name, format] = match;
	const date = nowIso().slice(0, 10);

	const download = (body: string, type: string, filename: string) =>
		new Response(body, {
			headers: {
				'content-type': `${type}; charset=utf-8`,
				'content-disposition': `attachment; filename="cellar-${filename}-${date}.${format}"`
			}
		});

	if (name === 'all' && format === 'json') {
		const all = Object.fromEntries(TABLE_NAMES.map((t) => [t, rowsForJson(tableRows(db, t))]));
		return download(JSON.stringify(all, null, 2), 'application/json', 'all');
	}
	if (!isTableName(name)) error(404, 'Unknown table');

	const rows = tableRows(db, name);
	return format === 'csv'
		? download(toCsv(rows, tableColumns(db, name)), 'text/csv', name)
		: download(JSON.stringify(rowsForJson(rows), null, 2), 'application/json', name);
};
