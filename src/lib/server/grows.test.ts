import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { schema } from './db';
import { testDb } from './db/test-helpers';
import { createProtocol } from './protocols';
import { createBatch, getBatchDetail } from './batches';
import { createObservation, deleteObservation, saveCheckIn } from './observations';
import { flushSummary, nextFlush, suggestedYield } from './grows';
import { emptyBody } from '../protocol-body';

function setup() {
	const db = testDb();
	const p = createProtocol(db, {
		name: 'Blue Oyster',
		batchType: 'mushroom',
		bodyJson: emptyBody()
	});
	const b = createBatch(db, {
		name: 'Grow 001 Blue Oyster',
		protocolId: p.id,
		startedAt: '2026-10-01T09:00:00-05:00',
		phase: 'spawn'
	});
	return { db, b };
}

const harvest = (grams: number) => [{ kind: 'harvest_weight', value: grams, unit: 'g' }];

describe('contamination', () => {
	it('saves typed events on a check-in, on its own or with a note', () => {
		const { db, b } = setup();
		createObservation(db, {
			batchId: b.id,
			observedAt: '2026-10-09T09:00:00-05:00',
			contaminations: [{ kind: 'trich', severity: 'spot', action: 'watching' }]
		});
		const obs = createObservation(db, {
			batchId: b.id,
			observedAt: '2026-10-10T09:00:00-05:00',
			note: 'Green spot grew, second patch by the filter',
			contaminations: [
				{ kind: 'trich', severity: 'patch', action: 'cut_out' },
				{ kind: 'cobweb', severity: 'spot', action: 'spot_treated' }
			]
		});
		const detail = getBatchDetail(db, b.id)!;
		expect(
			detail.observations[0].contaminations.map((c) => [c.kind, c.severity, c.action])
		).toEqual([
			['trich', 'patch', 'cut_out'],
			['cobweb', 'spot', 'spot_treated']
		]);
		expect(detail.observations[0].contaminations[0].id).toMatch(/^ctm_/);
		expect(detail.observations[1].contaminations).toHaveLength(1);

		// Deleting the check-in takes its events with it.
		deleteObservation(db, obs.id);
		expect(db.select().from(schema.contamination).all()).toHaveLength(1);
	});

	it('refuses an event with a value off the list', () => {
		const { db, b } = setup();
		expect(() =>
			createObservation(db, {
				batchId: b.id,
				// @ts-expect-error a value the form could post but the type does not allow
				contaminations: [{ kind: 'trich', severity: 'huge', action: 'watching' }]
			})
		).toThrow(/how bad/);
	});
});

describe('flushes', () => {
	it('numbers harvests as the next flush unless told otherwise', () => {
		const { db, b } = setup();
		expect(nextFlush(db, b.id)).toBe(1);
		const first = createObservation(db, {
			batchId: b.id,
			observedAt: '2026-10-20T09:00:00-05:00',
			readings: harvest(310)
		});
		expect(first.flush).toBe(1);
		// The rest of flush 1, picked the next day.
		const rest = createObservation(db, {
			batchId: b.id,
			observedAt: '2026-10-21T09:00:00-05:00',
			readings: harvest(95.5),
			flush: 1
		});
		expect(rest.flush).toBe(1);
		const second = createObservation(db, {
			batchId: b.id,
			observedAt: '2026-11-02T09:00:00-05:00',
			readings: [...harvest(220), { kind: 'rh', value: 90, unit: '%' }]
		});
		expect(second.flush).toBe(2);

		// A check-in with no harvest has no flush.
		const misted = createObservation(db, { batchId: b.id, note: 'Misted' });
		expect(misted.flush).toBeNull();

		const summary = flushSummary(db, b.id);
		expect(summary.flushes).toEqual([
			{ flush: 1, harvestedAt: '2026-10-20T09:00:00-05:00', harvests: 2, grams: 405.5 },
			{ flush: 2, harvestedAt: '2026-11-02T09:00:00-05:00', harvests: 1, grams: 220 }
		]);
		expect(summary.totalGrams).toBe(625.5);
		expect(suggestedYield(summary)).toEqual({ value: 625.5, unit: 'g' });
		expect(getBatchDetail(db, b.id)!.flushes.totalGrams).toBe(625.5);
	});

	it('adds up grams only, and suggests nothing before a harvest', () => {
		const { db, b } = setup();
		expect(suggestedYield(flushSummary(db, b.id))).toBeNull();
		createObservation(db, { batchId: b.id, readings: harvest(100) });
		createObservation(db, {
			batchId: b.id,
			readings: [{ kind: 'harvest_weight', value: 4, unit: 'oz' }]
		});
		const summary = flushSummary(db, b.id);
		expect(summary.totalGrams).toBe(100);
		expect(summary.skipped).toBe(1);
	});

	it('refuses a flush without a harvest weight and odd flush numbers', () => {
		const { db, b } = setup();
		expect(() => createObservation(db, { batchId: b.id, note: 'x', flush: 2 })).toThrow(
			/harvest weight for flush 2/
		);
		expect(() => createObservation(db, { batchId: b.id, readings: harvest(50), flush: 0 })).toThrow(
			/whole number/
		);
		expect(() => createObservation(db, { batchId: b.id, readings: harvest(0) })).toThrow(
			/more than 0/
		);
	});

	it('saves a harvest ticked with a task through the check-in', () => {
		const { db, b } = setup();
		const { observation } = saveCheckIn(db, { batchId: b.id, readings: harvest(80), taskIds: [] });
		expect(observation?.flush).toBe(1);
		const row = db
			.select()
			.from(schema.observation)
			.where(eq(schema.observation.id, observation!.id))
			.get();
		expect(row?.flush).toBe(1);
	});
});
