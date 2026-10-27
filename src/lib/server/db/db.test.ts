import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { openDb } from './index';
import { newId } from './ids';
import { schema } from './index';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { migrateToLatest, migrationCount, migrationsUpTo, testDb } from './test-helpers';
import { itemsForBatch, listInventory, useOne } from '../inventory';
import { getBatchDetail } from '../batches';
import { listOpenTasks } from '../tasks';
import { compareBatches, compareCandidates, familyBatches } from '../compare';

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
				'contamination',
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

	// Phase 3 (migration 3) adds observation.flush and the contamination table.
	// A ferment check-in and a Phase 2 repeating task, written the way
	// migration 2 left the database, must load with no flush and no events.
	it('keeps Phase 2 check-ins and tasks readable after the Phase 3 migrations', () => {
		const db = openDb(':memory:', migrationsUpTo(2));
		const t = '2026-10-26T20:00:00-05:00';
		db.$client.exec(`
			insert into protocol (id, family_id, name, batch_type, version, body_json, created_at, updated_at)
				values ('pro_bbbbbbbbbb', 'prf_bbbbbbbbbb', 'Kraut', 'ferment', 1, '{"ingredients":[],"steps":[],"targets":[],"expectedDays":21,"tasks":[{"title":"Top up airlock water","startDay":1,"recurrence":"weekly","endDay":28}]}', '${t}', '${t}');
			insert into batch (id, name, batch_type, protocol_id, started_at, status, phase, created_at, updated_at)
				values ('bat_bbbbbbbbbb', 'Ferment 002 Kraut', 'ferment', 'pro_bbbbbbbbbb', '${t}', 'active', 'primary ferment', '${t}', '${t}');
			insert into observation (id, batch_id, observed_at, phase, note, created_at, updated_at)
				values ('obs_bbbbbbbbbb', 'bat_bbbbbbbbbb', '${t}', 'primary ferment', 'Topped up', '${t}', '${t}');
			insert into task (id, batch_id, title, due_at, recurrence, repeat_until, created_at, updated_at)
				values ('tsk_bbbbbbbbbb', 'bat_bbbbbbbbbb', 'Top up airlock water', '2026-10-27', 'weekly', '2026-11-23', '${t}', '${t}');
		`);

		migrateToLatest(db);

		const o = db
			.select()
			.from(schema.observation)
			.where(eq(schema.observation.id, 'obs_bbbbbbbbbb'))
			.get();
		expect(o).toMatchObject({ note: 'Topped up', flush: null });
		expect(db.select().from(schema.contamination).all()).toEqual([]);
		const task = db.select().from(schema.task).where(eq(schema.task.id, 'tsk_bbbbbbbbbb')).get();
		expect(task).toMatchObject({ recurrence: 'weekly', repeatUntil: '2026-11-23' });
		const p = db
			.select()
			.from(schema.protocol)
			.where(eq(schema.protocol.id, 'pro_bbbbbbbbbb'))
			.get();
		expect(p?.bodyJson.tasks?.[0]).toMatchObject({ title: 'Top up airlock water', endDay: 28 });
	});

	// Phase 4 adds no migration: preserves live in body_json and inventory_item
	// has been in the baseline since the start. This test pins that down. A
	// shelf item and a ferment written on the first schema, and a Phase 3 grow
	// with a phase task written on the schema as Phase 3 left it, must load
	// through the Phase 4 shelf functions after every migration.
	it('keeps old shelf items, ferments, grows, and phase tasks readable', () => {
		const db = openDb(':memory:', migrationsUpTo(1));
		const t = '2026-10-26T20:00:00-05:00';
		db.$client.exec(`
			insert into space (id, name, kind, created_at, updated_at)
				values ('spc_cccccccccc', 'Shelf B', 'shelf', '${t}', '${t}');
			insert into protocol (id, family_id, name, batch_type, version, body_json, created_at, updated_at)
				values ('pro_cccccccccc', 'prf_cccccccccc', 'Kraut', 'ferment', 1, '{"ingredients":[],"steps":[],"targets":[],"expectedDays":21}', '${t}', '${t}');
			insert into batch (id, name, batch_type, protocol_id, protocol_snapshot_json, started_at, ended_at, status, created_at, updated_at)
				values ('bat_cccccccccc', 'Ferment 003 Kraut', 'ferment', 'pro_cccccccccc', '{"protocolId":"pro_cccccccccc","familyId":"prf_cccccccccc","name":"Kraut","version":1,"source":null,"notes":null,"body":{"ingredients":[],"steps":[],"targets":[],"expectedDays":21},"snapshotAt":"${t}"}', '${t}', '${t}', 'done', '${t}', '${t}');
			insert into inventory_item (id, batch_id, name, quantity, unit, space_id, packed_at, use_by, status, created_at, updated_at)
				values ('inv_cccccccccc', 'bat_cccccccccc', 'Kraut, quart', 3, 'jars', 'spc_cccccccccc', '2026-10-26', '2027-04-26', 'in_stock', '${t}', '${t}');
		`);

		migrate(db, { migrationsFolder: migrationsUpTo(4) });
		const grow = JSON.stringify({
			ingredients: [],
			steps: [],
			targets: [],
			expectedDays: 40,
			tasks: [
				{ title: 'Mist and fan', startDay: 0, recurrence: 'daily', endDay: null, phase: 'fruiting' }
			]
		});
		db.$client.exec(`
			insert into protocol (id, family_id, name, batch_type, version, body_json, created_at, updated_at)
				values ('pro_dddddddddd', 'prf_dddddddddd', 'Blue Oyster', 'mushroom', 1, '${grow}', '${t}', '${t}');
			insert into batch (id, name, batch_type, protocol_id, protocol_snapshot_json, started_at, status, phase, created_at, updated_at)
				values ('bat_dddddddddd', 'Grow 001 Blue Oyster', 'mushroom', 'pro_dddddddddd', '{"protocolId":"pro_dddddddddd","familyId":"prf_dddddddddd","name":"Blue Oyster","version":1,"source":null,"notes":null,"body":${grow},"snapshotAt":"${t}"}', '${t}', 'active', 'fruiting', '${t}', '${t}');
			insert into task (id, batch_id, title, due_at, recurrence, phase, created_at, updated_at)
				values ('tsk_dddddddddd', 'bat_dddddddddd', 'Mist and fan', '2026-10-27', 'daily', 'fruiting', '${t}', '${t}');
		`);

		migrateToLatest(db);

		expect(listInventory(db)).toEqual([
			expect.objectContaining({
				id: 'inv_cccccccccc',
				spacePath: 'Shelf B',
				batchName: 'Ferment 003 Kraut',
				useBy: '2027-04-26'
			})
		]);
		expect(itemsForBatch(db, 'bat_cccccccccc')).toHaveLength(1);
		expect(useOne(db, 'inv_cccccccccc').item).toMatchObject({ quantity: 2, status: 'low' });
		expect(getBatchDetail(db, 'bat_cccccccccc')?.batch.protocolSnapshotJson?.body.processing).toBe(
			undefined
		);
		expect(getBatchDetail(db, 'bat_dddddddddd')?.batch.phase).toBe('fruiting');
		expect(listOpenTasks(db, { batchId: 'bat_dddddddddd' }).map((x) => x.phase)).toEqual([
			'fruiting'
		]);
	});

	// Phase 5 adds no migration either: towers and seedlings are new batch
	// types and reading kinds in existing columns. Old ferments, grows with
	// flushes, and preserves with shelf items, written on older schemas with
	// snapshots that have no task list or processing, must still open in the
	// comparison.
	it('keeps old ferments, grows, and preserves comparable', () => {
		const db = openDb(':memory:', migrationsUpTo(1));
		const t = '2026-10-01T09:00:00-05:00';
		const later = '2026-10-11T09:00:00-05:00';
		const body =
			'{"ingredients":[],"steps":[],"targets":[{"kind":"ph","min":null,"max":4.6,"unit":"pH"}],"expectedDays":21}';
		const snap = (id: string, name: string) =>
			`{"protocolId":"pro_${id}","familyId":"prf_${id}","name":"${name}","version":1,"source":null,"notes":null,"body":${body},"snapshotAt":"${t}"}`;
		db.$client.exec(`
			insert into protocol (id, family_id, name, batch_type, version, body_json, created_at, updated_at)
				values ('pro_eeeeeeeeee', 'prf_eeeeeeeeee', 'Kraut', 'ferment', 1, '${body}', '${t}', '${t}');
			insert into batch (id, name, batch_type, protocol_id, protocol_snapshot_json, started_at, status, phase, created_at, updated_at)
				values ('bat_eeeeeeeee1', 'Ferment 001 Kraut', 'ferment', 'pro_eeeeeeeeee', '${snap('eeeeeeeeee', 'Kraut')}', '${t}', 'active', 'primary ferment', '${t}', '${t}'),
				       ('bat_eeeeeeeee2', 'Ferment 002 Kraut', 'ferment', 'pro_eeeeeeeeee', '${snap('eeeeeeeeee', 'Kraut')}', '${t}', 'active', 'primary ferment', '${t}', '${t}');
			insert into observation (id, batch_id, observed_at, phase, note, created_at, updated_at)
				values ('obs_eeeeeeeee1', 'bat_eeeeeeeee1', '${later}', 'primary ferment', 'Sour', '${t}', '${t}');
			insert into reading (id, observation_id, kind, value, unit, taken_at, created_at, updated_at)
				values ('rdg_eeeeeeeee1', 'obs_eeeeeeeee1', 'ph', 3.6, 'pH', '${later}', '${t}', '${t}');
			insert into protocol (id, family_id, name, batch_type, version, body_json, created_at, updated_at)
				values ('pro_gggggggggg', 'prf_gggggggggg', 'Dilly beans', 'preserve', 1, '${body}', '${t}', '${t}');
			insert into batch (id, name, batch_type, protocol_id, protocol_snapshot_json, started_at, ended_at, status, created_at, updated_at)
				values ('bat_ggggggggg1', 'Preserve 001 Dilly beans', 'preserve', 'pro_gggggggggg', '${snap('gggggggggg', 'Dilly beans')}', '${t}', '${later}', 'done', '${t}', '${t}'),
				       ('bat_ggggggggg2', 'Preserve 002 Dilly beans', 'preserve', 'pro_gggggggggg', '${snap('gggggggggg', 'Dilly beans')}', '${t}', '${later}', 'done', '${t}', '${t}');
			insert into outcome (id, batch_id, yield_value, yield_unit, rating, created_at, updated_at)
				values ('out_ggggggggg1', 'bat_ggggggggg1', 7, 'pints', 5, '${t}', '${t}');
			insert into inventory_item (id, batch_id, name, quantity, unit, status, created_at, updated_at)
				values ('inv_ggggggggg1', 'bat_ggggggggg1', 'Dilly beans, pint', 7, 'jars', 'in_stock', '${t}', '${t}');
		`);

		migrate(db, { migrationsFolder: migrationsUpTo(4) });
		db.$client.exec(`
			insert into protocol (id, family_id, name, batch_type, version, body_json, created_at, updated_at)
				values ('pro_ffffffffff', 'prf_ffffffffff', 'Blue Oyster', 'mushroom', 1, '${body}', '${t}', '${t}');
			insert into batch (id, name, batch_type, protocol_id, protocol_snapshot_json, started_at, status, phase, created_at, updated_at)
				values ('bat_fffffffff1', 'Grow 001 Blue Oyster', 'mushroom', 'pro_ffffffffff', '${snap('ffffffffff', 'Blue Oyster')}', '${t}', 'active', 'fruiting', '${t}', '${t}'),
				       ('bat_fffffffff2', 'Grow 002 Blue Oyster', 'mushroom', 'pro_ffffffffff', '${snap('ffffffffff', 'Blue Oyster')}', '${t}', 'active', 'spawn', '${t}', '${t}');
			insert into observation (id, batch_id, observed_at, phase, flush, created_at, updated_at)
				values ('obs_fffffffff1', 'bat_fffffffff1', '${later}', 'fruiting', 1, '${t}', '${t}');
			insert into reading (id, observation_id, kind, value, unit, taken_at, created_at, updated_at)
				values ('rdg_fffffffff1', 'obs_fffffffff1', 'harvest_weight', 250, 'g', '${later}', '${t}', '${t}');
		`);

		migrateToLatest(db);

		const kraut = compareBatches(db, ['bat_eeeeeeeee1', 'bat_eeeeeeeee2']);
		expect(kraut.batches[0].readings).toEqual([
			expect.objectContaining({ kind: 'ph', value: 3.6, dayNumber: 10 })
		]);
		expect(kraut.targets.ph).toMatchObject({ max: 4.6 });
		expect(kraut.phaseRows).toEqual(['primary ferment']);

		const grows = compareBatches(db, ['bat_fffffffff1', 'bat_fffffffff2']);
		expect(grows.batches.map((b) => b.harvests)).toEqual([
			{ count: 1, grams: 250 },
			{ count: 0, grams: 0 }
		]);
		expect(grows.batches[0].phases).toEqual({ fruiting: 10 });

		const jars = compareBatches(db, ['bat_ggggggggg1', 'bat_ggggggggg2']);
		expect(jars.batches[0]).toMatchObject({ days: 10, outcome: { yieldValue: 7, rating: 5 } });
		expect(itemsForBatch(db, 'bat_ggggggggg1')).toHaveLength(1);

		expect(familyBatches(db, 'prf_ffffffffff')).toHaveLength(2);
		expect(compareCandidates(db, 'preserve', 'prf_gggggggggg').map((b) => b.sameProtocol)).toEqual([
			true,
			true
		]);
	});
});
