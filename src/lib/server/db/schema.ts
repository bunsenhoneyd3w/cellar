// The whole Cellar data model (cellar-brief.md section 3). Imports are relative
// so drizzle-kit can load this file on its own when generating migrations.

import {
	sqliteTable,
	text,
	integer,
	real,
	index,
	unique,
	primaryKey,
	type AnySQLiteColumn
} from 'drizzle-orm/sqlite-core';
import { newId, type IdPrefix } from './ids';
import { nowIso } from '../../time';
import {
	BATCH_STATUSES,
	BATCH_TYPES,
	CONTAMINATION_ACTIONS,
	CONTAMINATION_KINDS,
	CONTAMINATION_SEVERITIES,
	EQUIPMENT_KINDS,
	INVENTORY_STATUSES,
	READING_SOURCES,
	SPACE_KINDS
} from '../../enums';
import type { ProtocolBody, ProtocolSnapshot } from '../../protocol-body';

const id = (prefix: IdPrefix) =>
	text('id')
		.primaryKey()
		.$defaultFn(() => newId(prefix));

const stamps = () => ({
	createdAt: text('created_at')
		.notNull()
		.$defaultFn(() => nowIso()),
	updatedAt: text('updated_at')
		.notNull()
		.$defaultFn(() => nowIso())
		.$onUpdateFn(() => nowIso())
});

export const space = sqliteTable('space', {
	id: id('spc'),
	name: text('name').notNull(),
	kind: text('kind', { enum: SPACE_KINDS }).notNull(),
	parentSpaceId: text('parent_space_id').references((): AnySQLiteColumn => space.id, {
		onDelete: 'set null'
	}),
	notes: text('notes'),
	...stamps()
});

export const equipment = sqliteTable('equipment', {
	id: id('eqp'),
	name: text('name').notNull(),
	kind: text('kind', { enum: EQUIPMENT_KINDS }).notNull(),
	model: text('model'),
	specsJson: text('specs_json', { mode: 'json' }).$type<Record<string, unknown>>(),
	spaceId: text('space_id').references(() => space.id, { onDelete: 'set null' }),
	notes: text('notes'),
	...stamps()
});

/**
 * A photo of a piece of equipment (D45, D46). One file can sit on several rows:
 * a shelf photo stays with every item it added. Paths are relative to the photos folder.
 */
export const equipmentPhoto = sqliteTable(
	'equipment_photo',
	{
		id: id('eph'),
		equipmentId: text('equipment_id')
			.notNull()
			.references(() => equipment.id, { onDelete: 'cascade' }),
		path: text('path').notNull(),
		originalPath: text('original_path'),
		caption: text('caption'),
		takenAt: text('taken_at'),
		...stamps()
	},
	(t) => [index('equipment_photo_equipment').on(t.equipmentId)]
);

/** Each edit inserts a new row with the same family_id and version + 1. */
export const protocol = sqliteTable(
	'protocol',
	{
		id: id('pro'),
		familyId: text('family_id').notNull(),
		name: text('name').notNull(),
		batchType: text('batch_type', { enum: BATCH_TYPES }).notNull(),
		version: integer('version').notNull(),
		source: text('source'),
		bodyJson: text('body_json', { mode: 'json' }).$type<ProtocolBody>().notNull(),
		notes: text('notes'),
		...stamps()
	},
	(t) => [unique('protocol_family_version').on(t.familyId, t.version)]
);

export const batch = sqliteTable(
	'batch',
	{
		id: id('bat'),
		name: text('name').notNull(),
		batchType: text('batch_type', { enum: BATCH_TYPES }).notNull(),
		protocolId: text('protocol_id').references(() => protocol.id, { onDelete: 'set null' }),
		protocolSnapshotJson: text('protocol_snapshot_json', {
			mode: 'json'
		}).$type<ProtocolSnapshot>(),
		spaceId: text('space_id').references(() => space.id, { onDelete: 'set null' }),
		startedAt: text('started_at'),
		endedAt: text('ended_at'),
		status: text('status', { enum: BATCH_STATUSES }).notNull().default('planned'),
		phase: text('phase'),
		notes: text('notes'),
		...stamps()
	},
	(t) => [index('batch_status').on(t.status), index('batch_type').on(t.batchType)]
);

export const batchEquipment = sqliteTable(
	'batch_equipment',
	{
		batchId: text('batch_id')
			.notNull()
			.references(() => batch.id, { onDelete: 'cascade' }),
		equipmentId: text('equipment_id')
			.notNull()
			.references(() => equipment.id, { onDelete: 'cascade' }),
		...stamps()
	},
	(t) => [primaryKey({ columns: [t.batchId, t.equipmentId] })]
);

export const observation = sqliteTable(
	'observation',
	{
		id: id('obs'),
		batchId: text('batch_id')
			.notNull()
			.references(() => batch.id, { onDelete: 'cascade' }),
		observedAt: text('observed_at').notNull(),
		phase: text('phase'),
		note: text('note'),
		/** Set on mushroom harvests (D23): which flush the harvest weight belongs to. */
		flush: integer('flush'),
		...stamps()
	},
	(t) => [index('observation_batch').on(t.batchId, t.observedAt)]
);

export const reading = sqliteTable(
	'reading',
	{
		id: id('rdg'),
		observationId: text('observation_id')
			.notNull()
			.references(() => observation.id, { onDelete: 'cascade' }),
		kind: text('kind').notNull(),
		value: real('value').notNull(),
		unit: text('unit').notNull(),
		takenAt: text('taken_at').notNull(),
		source: text('source', { enum: READING_SOURCES }).notNull().default('manual'),
		...stamps()
	},
	(t) => [index('reading_observation').on(t.observationId), index('reading_kind').on(t.kind)]
);

/** Paths are relative to the photos folder. No image data in the database. */
export const photo = sqliteTable(
	'photo',
	{
		id: id('pho'),
		observationId: text('observation_id')
			.notNull()
			.references(() => observation.id, { onDelete: 'cascade' }),
		path: text('path').notNull(),
		originalPath: text('original_path'),
		caption: text('caption'),
		takenAt: text('taken_at'),
		...stamps()
	},
	(t) => [index('photo_observation').on(t.observationId)]
);

/** A contamination event seen on a check-in (D22). Note and photos live on the observation. */
export const contamination = sqliteTable(
	'contamination',
	{
		id: id('ctm'),
		observationId: text('observation_id')
			.notNull()
			.references(() => observation.id, { onDelete: 'cascade' }),
		kind: text('kind', { enum: CONTAMINATION_KINDS }).notNull(),
		severity: text('severity', { enum: CONTAMINATION_SEVERITIES }).notNull(),
		action: text('action', { enum: CONTAMINATION_ACTIONS }).notNull(),
		...stamps()
	},
	(t) => [index('contamination_observation').on(t.observationId)]
);

export const outcome = sqliteTable('outcome', {
	id: id('out'),
	batchId: text('batch_id')
		.notNull()
		.unique()
		.references(() => batch.id, { onDelete: 'cascade' }),
	yieldValue: real('yield_value'),
	yieldUnit: text('yield_unit'),
	rating: integer('rating'),
	summary: text('summary'),
	wouldChange: text('would_change'),
	...stamps()
});

export const inventoryItem = sqliteTable('inventory_item', {
	id: id('inv'),
	batchId: text('batch_id').references(() => batch.id, { onDelete: 'set null' }),
	name: text('name').notNull(),
	quantity: real('quantity'),
	unit: text('unit'),
	spaceId: text('space_id').references(() => space.id, { onDelete: 'set null' }),
	packedAt: text('packed_at'),
	useBy: text('use_by'),
	status: text('status', { enum: INVENTORY_STATUSES }).notNull().default('in_stock'),
	...stamps()
});

/**
 * `due_at` is a local date such as 2026-10-27 (D18); `done_at` is a full
 * timestamp. Finishing a repeating task inserts the next one (D17), which
 * points back through `previous_task_id`.
 */
export const task = sqliteTable(
	'task',
	{
		id: id('tsk'),
		batchId: text('batch_id').references(() => batch.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		dueAt: text('due_at'),
		doneAt: text('done_at'),
		recurrence: text('recurrence'),
		/** Last date a repeat may land on; null repeats until the batch ends. */
		repeatUntil: text('repeat_until'),
		previousTaskId: text('previous_task_id').references((): AnySQLiteColumn => task.id, {
			onDelete: 'set null'
		}),
		/** Set on tasks that belong to a phase (D26); they live only while the batch is in it. */
		phase: text('phase'),
		...stamps()
	},
	(t) => [index('task_due').on(t.dueAt), index('task_batch').on(t.batchId)]
);

/** Every table, in an order where parents come before children. Used by export. */
export const ALL_TABLES = {
	space,
	equipment,
	equipment_photo: equipmentPhoto,
	protocol,
	batch,
	batch_equipment: batchEquipment,
	observation,
	reading,
	photo,
	contamination,
	outcome,
	inventory_item: inventoryItem,
	task
} as const;
