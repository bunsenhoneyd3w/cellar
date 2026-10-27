import { describe, expect, it } from 'vitest';
import { testDb } from './db/test-helpers';
import { createProtocol } from './protocols';
import { createBatch, getBatchDetail, listBatches } from './batches';
import { finishBatch, reopenBatch } from './outcomes';
import { emptyBody } from '../protocol-body';
import { itemsForBatch } from './inventory';
import { readShelfRows } from './inventory-form';

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

describe('finishing onto the shelf (D29)', () => {
	const done = { status: 'done' as const, endedAt: '2026-10-28T08:00:00-05:00' };

	it('adds the rows with a count, packed on the end day, linked to the batch', () => {
		const { db, b } = setup();
		const fd = new FormData();
		for (const [k, v] of Object.entries({
			shelfCount: '3',
			shelf_0_name: 'Hot sauce, 5 oz',
			shelf_0_quantity: '6',
			shelf_0_unit: 'bottles',
			shelf_0_useBy: '2027-04-28',
			shelf_1_name: 'Hot sauce, pint',
			shelf_1_quantity: '',
			shelf_2_name: 'Hot sauce, half pint',
			shelf_2_quantity: '1'
		}))
			fd.set(k, v);
		finishBatch(db, b.id, done, readShelfRows(fd));
		expect(
			itemsForBatch(db, b.id).map((i) => [i.name, i.quantity, i.packedAt, i.useBy, i.status])
		).toEqual([
			['Hot sauce, 5 oz', 6, '2026-10-28', '2027-04-28', 'in_stock'],
			['Hot sauce, half pint', 1, '2026-10-28', null, 'low']
		]);
	});

	it('saves nothing when a row is wrong', () => {
		const { db, b } = setup();
		expect(() =>
			finishBatch(db, b.id, done, [{ name: 'Hot sauce', quantity: 6, useBy: '2026-01-01' }])
		).toThrow(/before the packed date/);
		expect(getBatchDetail(db, b.id)?.batch.status).toBe('active');
		expect(itemsForBatch(db, b.id)).toEqual([]);
	});

	it('puts nothing on the shelf from a failed batch', () => {
		const { db, b } = setup();
		finishBatch(db, b.id, { ...done, status: 'failed' }, [{ name: 'Hot sauce', quantity: 6 }]);
		expect(itemsForBatch(db, b.id)).toEqual([]);
	});
});
