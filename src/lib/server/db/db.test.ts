import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { openDb } from './index';
import { newId } from './ids';
import { schema } from './index';
import { migrateToLatest, migrationCount, migrationsUpTo, testDb } from './test-helpers';

describe('ids', () => {
	it('are a prefix plus 10 readable characters', () => {
		const id = newId('bat');
		expect(id).toMatch(/^bat_[23456789abcdefghjkmnpqrstuvwxyz]{10}$/);
	});

	it('do not repeat', () => {
		const ids = new Set(Array.from({ length: 5000 }, () => newId('rdg')));
		expect(ids.size).toBe(5000);
	});
});

describe('database', () => {
	it('creates every table on an empty database', () => {
		const db = testDb();
		const tables = db.$client
			.prepare(
				"select name from sqlite_master where type = 'table' and name not like '\\_\\_%' escape '\\' and name != 'sqlite_sequence'"
			)
			.all()
			.map((r) => (r as { name: string }).name)
			.sort();
		expect(tables).toEqual(
			[
				'batch',
				'batch_equipment',
				'equipment',
				'inventory_item',
				'observation',
				'outcome',
				'photo',
				'protocol',
				'reading',
				'space',
				'task'
			].sort()
		);
	});

	it('fills id, created_at, and updated_at on insert', () => {
		const db = testDb();
		const [row] = db
			.insert(schema.space)
			.values({ name: 'Basement lab', kind: 'room' })
			.returning()
			.all();
		expect(row.id).toMatch(/^spc_/);
		expect(row.createdAt).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[+-]\d\d:\d\d$/);
		expect(row.updatedAt).toBe(row.createdAt);
	});

	it('enforces foreign keys', () => {
		const db = testDb();
		expect(() =>
			db
				.insert(schema.observation)
				.values({ batchId: 'bat_missing000', observedAt: '2026-10-26T20:00:00-05:00' })
				.run()
		).toThrow(/FOREIGN KEY/);
	});
});

// CLAUDE.md rule 7: a schema change must not break old batches. This test
// writes a batch the way the very first schema stored it, using plain SQL that
// must never be edited, then applies every later migration and reads it back
// through the current schema. A migration that drops or renames something an
// old batch relies on fails here.
describe('migration safety', () => {
	it('keeps a batch written by the first schema readable after every migration', () => {
		const db = openDb(':memory:', migrationsUpTo(1));
		const t = '2026-10-26T20:00:00-05:00';
		const snapshot = JSON.stringify({
			protocolId: 'pro_aaaaaaaaaa',
			familyId: 'prf_aaaaaaaaaa',
			name: 'Hot sauce',
			version: 1,
			source: 'own',
			notes: null,
			body: { ingredients: ['1 lb peppers'], steps: ['Chop'], targets: [], expectedDays: 14 },
			snapshotAt: t
		});
		db.$client.exec(`
			insert into space (id, name, kind, created_at, updated_at)
				values ('spc_aaaaaaaaaa', 'Basement lab', 'room', '${t}', '${t}');
			insert into protocol (id, family_id, name, batch_type, version, source, body_json, created_at, updated_at)
				values ('pro_aaaaaaaaaa', 'prf_aaaaaaaaaa', 'Hot sauce', 'ferment', 1, 'own', '{}', '${t}', '${t}');
			insert into batch (id, name, batch_type, protocol_id, protocol_snapshot_json, space_id, started_at, status, phase, created_at, updated_at)
				values ('bat_aaaaaaaaaa', 'Ferment 001 Hot sauce', 'ferment', 'pro_aaaaaaaaaa', '${snapshot}', 'spc_aaaaaaaaaa', '${t}', 'active', 'primary ferment', '${t}', '${t}');
			insert into observation (id, batch_id, observed_at, phase, note, created_at, updated_at)
				values ('obs_aaaaaaaaaa', 'bat_aaaaaaaaaa', '${t}', 'primary ferment', 'Bubbling', '${t}', '${t}');
			insert into reading (id, observation_id, kind, value, unit, taken_at, source, created_at, updated_at)
				values ('rdg_aaaaaaaaaa', 'obs_aaaaaaaaaa', 'ph', 3.6, 'pH', '${t}', 'manual', '${t}', '${t}');
		`);

		migrateToLatest(db);
		expect(migrationCount()).toBeGreaterThanOrEqual(1);

		const b = db.select().from(schema.batch).where(eq(schema.batch.id, 'bat_aaaaaaaaaa')).get();
		expect(b?.protocolSnapshotJson?.name).toBe('Hot sauce');
		expect(b?.protocolSnapshotJson?.body.expectedDays).toBe(14);
		const r = db.select().from(schema.reading).where(eq(schema.reading.id, 'rdg_aaaaaaaaaa')).get();
		expect(r).toMatchObject({ kind: 'ph', value: 3.6, unit: 'pH' });
	});
});
