import { describe, expect, it } from 'vitest';
import { testDb } from './db/test-helpers';
import { createProtocol, reviseProtocol } from './protocols';
import { createBatch } from './batches';
import { saveCheckIn } from './observations';
import { finishBatch } from './outcomes';
import { compareBatches, compareCandidates, familyBatches } from './compare';
import { emptyBody } from '../protocol-body';

const ec = { kind: 'ec', min: 1.2, max: 2, unit: 'mS/cm' };

function setup() {
	const db = testDb();
	const lettuce = createProtocol(db, {
		name: 'Lettuce',
		batchType: 'hydroponic',
		bodyJson: { ...emptyBody(), targets: [ec] }
	});
	const basil = createProtocol(db, {
		name: 'Basil',
		batchType: 'hydroponic',
		bodyJson: emptyBody()
	});
	const run = (protocolId: string, n: number, startedAt: string) =>
		createBatch(db, { name: `Tower 00${n}`, protocolId, startedAt, phase: 'germination' });
	const t1 = run(lettuce.id, 1, '2026-03-01T09:00:00-06:00');
	const t2 = run(basil.id, 2, '2026-05-01T09:00:00-05:00');
	// Version 2 of lettuce is still the same protocol.
	const lettuce2 = reviseProtocol(db, lettuce.id, {
		name: 'Lettuce',
		batchType: 'hydroponic',
		bodyJson: { ...emptyBody(), targets: [ec], expectedDays: 50 }
	});
	const t3 = run(lettuce2.id, 3, '2026-09-01T09:00:00-05:00');
	return { db, lettuce, basil, t1, t2, t3 };
}

describe('compare candidates', () => {
	it('lists the same protocol first, any version, then the rest of the type', () => {
		const { db, lettuce, t1, t2, t3 } = setup();
		const fermentP = createProtocol(db, {
			name: 'Kraut',
			batchType: 'ferment',
			bodyJson: emptyBody()
		});
		createBatch(db, { name: 'Ferment 001 Kraut', protocolId: fermentP.id });
		const list = compareCandidates(db, 'hydroponic', lettuce.familyId);
		expect(list.map((b) => [b.id, b.sameProtocol])).toEqual([
			[t3.id, true],
			[t1.id, true],
			[t2.id, false]
		]);
		expect(familyBatches(db, lettuce.familyId).map((b) => b.id)).toEqual([t3.id, t1.id]);
	});
});

describe('compare batches', () => {
	it('lines readings up by day since start and keeps the outcome and phases', () => {
		const { db, t1, t3 } = setup();
		saveCheckIn(db, {
			batchId: t1.id,
			observedAt: '2026-03-11T09:00:00-06:00',
			phase: 'vegetative',
			note: 'Into the tower',
			readings: [{ kind: 'ec', value: 1.4, unit: 'mS/cm' }]
		});
		saveCheckIn(db, {
			batchId: t1.id,
			observedAt: '2026-04-10T09:00:00-05:00',
			phase: 'harvest',
			readings: [{ kind: 'harvest_weight', value: 300, unit: 'g' }]
		});
		finishBatch(db, t1.id, {
			status: 'done',
			endedAt: '2026-04-20T09:00:00-05:00',
			yieldValue: 300,
			yieldUnit: 'g',
			rating: 4,
			summary: 'Good',
			wouldChange: null
		});
		saveCheckIn(db, {
			batchId: t3.id,
			observedAt: '2026-09-11T21:00:00-05:00',
			phase: 'vegetative',
			note: 'Into the tower',
			readings: [{ kind: 'ec', value: 1.7, unit: 'mS/cm' }]
		});

		const c = compareBatches(db, [t1.id, t3.id]);
		expect(c.type).toBe('hydroponic');
		const [a, b] = c.batches;
		expect(a.readings).toEqual([expect.objectContaining({ kind: 'ec', day: 10, dayNumber: 10 })]);
		expect(b.readings).toEqual([expect.objectContaining({ kind: 'ec', day: 10.5 })]);
		expect(a.harvests).toEqual({ count: 1, grams: 300 });
		expect(a.outcome?.rating).toBe(4);
		expect(a.days).toBe(50);
		expect(a.phases).toEqual({ vegetative: 10, harvest: 40 });
		expect(c.phaseRows).toEqual(['vegetative', 'harvest']);
		// Same protocol, same EC target: one band.
		expect(c.targets.ec).toEqual(ec);
	});

	it('drops unknown ids, repeats, other types, and anything past four', () => {
		const { db, t1, t2, t3 } = setup();
		const fermentP = createProtocol(db, {
			name: 'Kraut',
			batchType: 'ferment',
			bodyJson: emptyBody()
		});
		const kraut = createBatch(db, { name: 'Ferment 001 Kraut', protocolId: fermentP.id });
		const t4 = createBatch(db, { name: 'Tower 004', protocolId: t2.protocolId! });
		const t5 = createBatch(db, { name: 'Tower 005', protocolId: t2.protocolId! });
		const c = compareBatches(db, [
			t1.id,
			'bat_nonexistent',
			t1.id,
			kraut.id,
			t2.id,
			t3.id,
			t4.id,
			t5.id
		]);
		expect(c.batches.map((b) => b.id)).toEqual([t1.id, t2.id, t3.id, t4.id]);
		expect(c.leftOut).toBe(3);
		// Lettuce has an EC target and basil does not, so no band.
		expect(c.targets.ec).toBeUndefined();
	});

	it('is empty for no batches', () => {
		const { db } = setup();
		expect(compareBatches(db, [])).toMatchObject({ type: undefined, batches: [], phaseRows: [] });
	});
});
