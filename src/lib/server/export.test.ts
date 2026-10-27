import { describe, expect, it } from 'vitest';
import { testDb } from './db/test-helpers';
import { createProtocol } from './protocols';
import { createSpace } from './spaces';
import {
	isTableName,
	rowsForJson,
	TABLE_NAMES,
	tableColumns,
	tableCounts,
	tableRows,
	toCsv
} from './export';
import { emptyBody } from '../protocol-body';

describe('export', () => {
	it('covers every table in the database', () => {
		const db = testDb();
		const inDb = db.$client
			.prepare(
				"select name from sqlite_master where type = 'table' and name not like '\\_\\_%' escape '\\' and name != 'sqlite_sequence'"
			)
			.all()
			.map((r) => (r as { name: string }).name);
		expect([...TABLE_NAMES].sort()).toEqual(inDb.sort());
		expect(isTableName('batch')).toBe(true);
		expect(isTableName('batch; drop table batch')).toBe(false);
	});

	it('quotes commas, quotes, and line breaks', () => {
		const csv = toCsv([
			{ id: 'a', note: 'Plain' },
			{ id: 'b', note: 'Salt, then "massage"\nuntil wet' },
			{ id: 'c', note: null }
		]);
		expect(csv).toBe('id,note\r\na,Plain\r\nb,"Salt, then ""massage""\nuntil wet"\r\nc,\r\n');
	});

	it('exports rows with database column names and real JSON objects', () => {
		const db = testDb();
		createSpace(db, { name: 'Basement lab', kind: 'room' });
		createProtocol(db, {
			name: 'Kraut',
			batchType: 'ferment',
			bodyJson: { ...emptyBody(), expectedDays: 21 }
		});

		const rows = tableRows(db, 'protocol');
		expect(Object.keys(rows[0])).toContain('body_json');
		expect(typeof rows[0].body_json).toBe('string');
		expect((rowsForJson(rows)[0].body_json as { expectedDays: number }).expectedDays).toBe(21);

		expect(tableCounts(db).find((t) => t.name === 'space')?.count).toBe(1);
		expect(toCsv([], tableColumns(db, 'task')).split('\r\n')[0]).toBe(
			'id,batch_id,title,due_at,done_at,recurrence,created_at,updated_at,repeat_until,previous_task_id'
		);
	});
});
