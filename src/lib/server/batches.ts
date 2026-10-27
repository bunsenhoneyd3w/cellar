import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import type { Db } from './db';
import {
	batch,
	batchEquipment,
	equipment,
	observation,
	outcome,
	photo,
	protocol,
	reading,
	space
} from './db/schema';
import type { BatchStatus, BatchType } from '../enums';
import type { ProtocolSnapshot } from '../protocol-body';
import { nowIso } from '../time';
import { InputError } from './form';
import { getProtocol } from './protocols';
import { applyPhaseChange, createTasksFromTemplates } from './tasks';
import { contaminationsFor, flushSummary } from './grows';

export { batchName } from '../batch-name';

export type Batch = typeof batch.$inferSelect;

export type NewBatchInput = {
	name: string;
	protocolId: string;
	spaceId?: string | null;
	equipmentIds?: string[];
	startedAt?: string | null;
	phase?: string | null;
	notes?: string | null;
};

export type BatchEditInput = Omit<NewBatchInput, 'protocolId'>;

/** Next batch number for a type, e.g. 3 when two ferments exist. */
export function nextBatchNumber(db: Db, type: BatchType): number {
	const row = db
		.select({ n: sql<number>`count(*)` })
		.from(batch)
		.where(eq(batch.batchType, type))
		.get();
	return (row?.n ?? 0) + 1;
}

/**
 * Starts a batch from a protocol. The protocol is copied into the batch as it
 * is right now (CLAUDE.md rule 4); later edits to the protocol make new
 * versions and never reach this copy. Tasks the protocol lists are created
 * from that copy (D19).
 */
export function createBatch(db: Db, input: NewBatchInput): Batch {
	if (!input.name.trim()) throw new InputError('Give the batch a name.');
	const p = getProtocol(db, input.protocolId);
	if (!p) throw new InputError('Pick a protocol to follow.');

	const startedAt = input.startedAt ?? nowIso();
	const snapshot: ProtocolSnapshot = {
		protocolId: p.id,
		familyId: p.familyId,
		name: p.name,
		version: p.version,
		source: p.source,
		notes: p.notes,
		body: structuredClone(p.bodyJson),
		snapshotAt: nowIso()
	};

	return db.transaction((tx) => {
		const row = tx
			.insert(batch)
			.values({
				name: input.name.trim(),
				batchType: p.batchType,
				protocolId: p.id,
				protocolSnapshotJson: snapshot,
				spaceId: input.spaceId || null,
				startedAt,
				status: new Date(startedAt) > new Date() ? 'planned' : 'active',
				phase: input.phase ?? null,
				notes: input.notes ?? null
			})
			.returning()
			.get();
		setEquipment(tx, row.id, input.equipmentIds ?? []);
		createTasksFromTemplates(tx, row);
		return row;
	});
}

export function updateBatch(db: Db, id: string, input: BatchEditInput): Batch {
	if (!input.name.trim()) throw new InputError('Give the batch a name.');
	return db.transaction((tx) => {
		const current = getBatch(tx, id);
		if (!current) throw new InputError('That batch no longer exists.');
		const startedAt = input.startedAt ?? current.startedAt;
		// A planned batch becomes active once its start date arrives; finished batches keep their status.
		const status: BatchStatus =
			current.status === 'planned' || current.status === 'active'
				? startedAt && new Date(startedAt) > new Date()
					? 'planned'
					: 'active'
				: current.status;
		const row = tx
			.update(batch)
			.set({
				name: input.name.trim(),
				spaceId: input.spaceId || null,
				startedAt,
				status,
				phase: input.phase ?? null,
				notes: input.notes ?? null
			})
			.where(eq(batch.id, id))
			.returning()
			.get();
		setEquipment(tx, id, input.equipmentIds ?? []);
		if (row.phase !== current.phase) applyPhaseChange(tx, row, row.phase);
		return row;
	});
}

function setEquipment(db: Db, batchId: string, ids: string[]) {
	db.delete(batchEquipment).where(eq(batchEquipment.batchId, batchId)).run();
	const unique = [...new Set(ids.filter(Boolean))];
	if (unique.length) {
		db.insert(batchEquipment)
			.values(unique.map((equipmentId) => ({ batchId, equipmentId })))
			.run();
	}
}

export function getBatch(db: Db, id: string): Batch | undefined {
	return db.select().from(batch).where(eq(batch.id, id)).get();
}

export type BatchFilter = { status?: BatchStatus[]; type?: BatchType };

/** Batches with their space and the time of the latest observation, newest first. */
export function listBatches(db: Db, filter: BatchFilter = {}) {
	const lastObserved = db
		.select({
			batchId: observation.batchId,
			last: sql<string>`max(${observation.observedAt})`.as('last'),
			count: sql<number>`count(*)`.as('count')
		})
		.from(observation)
		.groupBy(observation.batchId)
		.as('last_obs');

	return db
		.select({
			batch,
			spaceName: space.name,
			lastObservedAt: lastObserved.last,
			observationCount: lastObserved.count
		})
		.from(batch)
		.leftJoin(space, eq(batch.spaceId, space.id))
		.leftJoin(lastObserved, eq(lastObserved.batchId, batch.id))
		.where(
			and(
				filter.status?.length ? inArray(batch.status, filter.status) : undefined,
				filter.type ? eq(batch.batchType, filter.type) : undefined
			)
		)
		.orderBy(desc(batch.startedAt))
		.all()
		.map((r) => ({
			...r.batch,
			spaceName: r.spaceName,
			lastObservedAt: r.lastObservedAt,
			observationCount: r.observationCount ?? 0
		}));
}

/**
 * Everything the batch page shows: the batch, where it is, what it uses, its
 * timeline (with contamination events), its flushes, and its outcome.
 */
export function getBatchDetail(db: Db, id: string) {
	const b = getBatch(db, id);
	if (!b) return undefined;

	const spaceRow = b.spaceId
		? db.select().from(space).where(eq(space.id, b.spaceId)).get()
		: undefined;
	const gear = db
		.select({ id: equipment.id, name: equipment.name, kind: equipment.kind })
		.from(batchEquipment)
		.innerJoin(equipment, eq(batchEquipment.equipmentId, equipment.id))
		.where(eq(batchEquipment.batchId, id))
		.orderBy(asc(equipment.name))
		.all();

	const obs = db
		.select()
		.from(observation)
		.where(eq(observation.batchId, id))
		.orderBy(desc(observation.observedAt))
		.all();
	const obsIds = obs.map((o) => o.id);
	const readings = obsIds.length
		? db
				.select()
				.from(reading)
				.where(inArray(reading.observationId, obsIds))
				.orderBy(asc(reading.takenAt))
				.all()
		: [];
	const photos = obsIds.length
		? db
				.select()
				.from(photo)
				.where(inArray(photo.observationId, obsIds))
				.orderBy(asc(photo.createdAt))
				.all()
		: [];
	const contaminations = contaminationsFor(db, obsIds);

	const latestProtocol = b.protocolSnapshotJson
		? db
				.select({ id: protocol.id, version: protocol.version })
				.from(protocol)
				.where(eq(protocol.familyId, b.protocolSnapshotJson.familyId))
				.orderBy(desc(protocol.version))
				.get()
		: undefined;

	return {
		batch: b,
		space: spaceRow,
		equipment: gear,
		equipmentIds: gear.map((g) => g.id),
		observations: obs.map((o) => ({
			...o,
			readings: readings.filter((r) => r.observationId === o.id),
			photos: photos.filter((p) => p.observationId === o.id),
			contaminations: contaminations.filter((c) => c.observationId === o.id)
		})),
		readings,
		flushes: flushSummary(db, id),
		outcome: db.select().from(outcome).where(eq(outcome.batchId, id)).get(),
		latestProtocol
	};
}
