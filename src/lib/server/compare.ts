import type { Db } from './db';
import { getBatchDetail, listBatches } from './batches';
import { fixedPhases, hasHarvests, type BatchType } from '../enums';
import { HARVEST_KIND, germination } from '../reading-kinds';
import { MAX_COMPARE, daysSince, phaseRows, phaseTimeline, sharedTarget } from '../compare';
import { dayNumber } from '../time';

// Batch comparison (D39 to D41): batches of one type side by side, lined up
// on days since each one's Day 0.

/** Batches started from any version of a protocol, newest first. */
export function familyBatches(db: Db, familyId: string) {
	return listBatches(db, { familyId });
}

/**
 * Batches that can be picked to compare (D40): every batch of the type, the
 * ones from the given protocol first, newest first within each group.
 */
export function compareCandidates(db: Db, type: BatchType, familyId?: string | null) {
	return listBatches(db, { type })
		.map((b) => ({
			...b,
			sameProtocol: !!familyId && b.protocolSnapshotJson?.familyId === familyId
		}))
		.sort((a, c) => Number(c.sameProtocol) - Number(a.sameProtocol));
}

/**
 * Everything the compare screen shows for up to four batches. Ids that do not
 * exist, repeats, and batches of another type than the first are left out;
 * `leftOut` counts them so the screen can say so.
 */
export function compareBatches(db: Db, ids: string[]) {
	const unique = [...new Set(ids)];
	const details = unique
		.map((id) => getBatchDetail(db, id))
		.filter((d): d is NonNullable<typeof d> => !!d);
	const type = details[0]?.batch.batchType;
	const kept = details.filter((d) => d.batch.batchType === type).slice(0, MAX_COMPARE);

	const batches = kept.map((d) => {
		const b = d.batch;
		const snap = b.protocolSnapshotJson;
		// Day 0 is the start; a batch with no start date counts from its first reading.
		const start = b.startedAt ?? d.readings[0]?.takenAt ?? null;
		return {
			id: b.id,
			name: b.name,
			status: b.status,
			phase: b.phase,
			startedAt: b.startedAt,
			endedAt: b.endedAt,
			protocol: snap ? { id: snap.protocolId, name: snap.name, version: snap.version } : null,
			days: b.startedAt ? dayNumber(b.startedAt, b.endedAt) : null,
			outcome: d.outcome ?? null,
			harvests: hasHarvests(b.batchType)
				? { count: d.flushes.flushes.length, grams: d.flushes.totalGrams }
				: null,
			germination: germination(d.readings),
			phases: phaseTimeline(d.observations, b.startedAt, fixedPhases(b.batchType)?.[0]),
			targets: snap?.body.targets ?? [],
			readings: d.readings
				.filter((r) => r.kind !== HARVEST_KIND)
				.map((r) => ({
					kind: r.kind,
					value: r.value,
					unit: r.unit,
					takenAt: r.takenAt,
					day: start ? daysSince(start, r.takenAt) : 0,
					dayNumber: start ? dayNumber(start, r.takenAt) : 0
				}))
		};
	});

	const kinds = [...new Set(batches.flatMap((b) => b.readings.map((r) => r.kind)))];
	return {
		type,
		batches,
		leftOut: unique.length - batches.length,
		phaseRows: type
			? phaseRows(
					type,
					batches.map((b) => b.phases)
				)
			: [],
		targets: Object.fromEntries(
			kinds.map((k) => [
				k,
				sharedTarget(
					batches.map((b) => b.targets),
					k
				)
			])
		)
	};
}

export type Comparison = ReturnType<typeof compareBatches>;
