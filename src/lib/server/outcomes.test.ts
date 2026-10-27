import { describe, expect, it } from 'vitest';
import { testDb } from './db/test-helpers';
import { createProtocol } from './protocols';
import { createBatch, getBatchDetail, listBatches } from './batches';
import { finishBatch, reopenBatch } from './outcomes';
import { emptyBody } from '../protocol-body';

function setup() {
	const db = testDb();
	const p = createProtocol(db, { name: 'Hot sauce', batchType: 'ferment', bodyJson: emptyBody() });
	const b = createBatch(db, {
		name: 'Ferment 001 Hot sauce',
		protocolId: p.id,
		startedAt: '2026-10-01T18:00:00-05:00'
	});
	return { db, b };
}

describe('outcomes', () => {
	it('ends the batch and records the outcome together', () => {
		const { db, b } = setup();
		finishBatch(db, b.id, {
			status: 'done',
			endedAt: '2026-10-22T19:00:00-05:00',
			yieldValue: 1.5,
			yieldUnit: 'pints',
			rating: 4,
			summary: 'Bright and hot.',
			wouldChange: 'More garlic.'
		});
		const d = getBatchDetail(db, b.id)!;
		expect(d.batch).toMatchObject({ status: 'done', endedAt: '2026-10-22T19:00:00-05:00' });
		expect(d.outcome).toMatchObject({
			yieldValue: 1.5,
			yieldUnit: 'pints',
			rating: 4,
			wouldChange: 'More garlic.'
		});
		expect(listBatches(db, { status: ['active'] })).toHaveLength(0);
	});

	it('keeps one outcome per batch; finishing again edits it', () => {
		const { db, b } = setup();
		const first = finishBatch(db, b.id, { status: 'done', rating: 3 });
		const second = finishBatch(db, b.id, {
			status: 'failed',
			rating: 1,
			summary: 'Kahm yeast took over.'
		});
		expect(second.id).toBe(first.id);
		expect(getBatchDetail(db, b.id)!.batch.status).toBe('failed');
		expect(getBatchDetail(db, b.id)!.outcome?.summary).toBe('Kahm yeast took over.');
	});

	it('reopens a batch ended by mistake', () => {
		const { db, b } = setup();
		finishBatch(db, b.id, { status: 'done' });
		reopenBatch(db, b.id);
		expect(getBatchDetail(db, b.id)!.batch).toMatchObject({ status: 'active', endedAt: null });
	});

	it('checks rating, yield, and dates', () => {
		const { db, b } = setup();
		expect(() => finishBatch(db, b.id, { status: 'done', rating: 6 })).toThrow(/1 to 5/);
		expect(() => finishBatch(db, b.id, { status: 'done', yieldValue: 2 })).toThrow(/unit/);
		expect(() =>
			finishBatch(db, b.id, { status: 'done', endedAt: '2026-09-01T00:00:00-05:00' })
		).toThrow(/before Day 0/);
	});
});
