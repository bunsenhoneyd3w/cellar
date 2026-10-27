import { and, asc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import type { Db } from './db';
import { contamination, observation, reading } from './db/schema';
import { HARVEST_KIND } from '../reading-kinds';

// Flushes (D23) and contamination (D22) on mushroom grows. A harvest is an
// observation with a harvest weight and a flush number; there is no separate
// harvest record.

export type Contamination = typeof contamination.$inferSelect;

/** The flush a new harvest belongs to by default: one past the highest so far. */
export function nextFlush(db: Db, batchId: string): number {
	const row = db
		.select({ n: sql<number | null>`max(${observation.flush})` })
		.from(observation)
		.where(eq(observation.batchId, batchId))
		.get();
	return (row?.n ?? 0) + 1;
}

export type FlushTotal = {
	flush: number;
	/** First harvest of the flush; a flush picked over two days has two. */
	harvestedAt: string;
	harvests: number;
	grams: number;
};

/**
 * Harvest weight per flush, oldest flush first. Only readings stored in grams
 * are added up; the unit is read from each row, never assumed.
 */
export function flushSummary(db: Db, batchId: string) {
	const rows = db
		.select({
			observationId: observation.id,
			flush: observation.flush,
			observedAt: observation.observedAt,
			value: reading.value,
			unit: reading.unit
		})
		.from(observation)
		.innerJoin(reading, eq(reading.observationId, observation.id))
		.where(
			and(
				eq(observation.batchId, batchId),
				isNotNull(observation.flush),
				eq(reading.kind, HARVEST_KIND)
			)
		)
		.orderBy(asc(observation.flush), asc(observation.observedAt))
		.all();

	const byFlush = new Map<number, FlushTotal & { seen: Set<string> }>();
	let skipped = 0;
	for (const r of rows) {
		const n = r.flush!;
		let f = byFlush.get(n);
		if (!f) {
			f = { flush: n, harvestedAt: r.observedAt, harvests: 0, grams: 0, seen: new Set() };
			byFlush.set(n, f);
		}
		if (!f.seen.has(r.observationId)) {
			f.seen.add(r.observationId);
			f.harvests++;
		}
		if (r.unit === 'g') f.grams += r.value;
		else skipped++;
	}
	const flushes: FlushTotal[] = [...byFlush.values()].map((f) => ({
		flush: f.flush,
		harvestedAt: f.harvestedAt,
		harvests: f.harvests,
		grams: f.grams
	}));
	return {
		flushes,
		totalGrams: flushes.reduce((sum, f) => sum + f.grams, 0),
		/** Harvest readings in a unit other than grams, left out of the totals. */
		skipped
	};
}

export type FlushSummary = ReturnType<typeof flushSummary>;

/** What the finish screen fills in as the yield of a grow, or null before any harvest. */
export function suggestedYield(summary: FlushSummary): { value: number; unit: string } | null {
	if (!summary.flushes.length) return null;
	return { value: Math.round(summary.totalGrams * 10) / 10, unit: 'g' };
}

/** Contamination events on a set of observations, oldest first. */
export function contaminationsFor(db: Db, observationIds: string[]): Contamination[] {
	if (!observationIds.length) return [];
	return db
		.select()
		.from(contamination)
		.where(inArray(contamination.observationId, observationIds))
		.orderBy(asc(contamination.createdAt))
		.all();
}
