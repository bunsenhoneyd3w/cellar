import { describe, expect, it } from 'vitest';
import { testDb } from './db/test-helpers';
import { createProtocol } from './protocols';
import { createBatch } from './batches';
import { createSpace } from './spaces';
import {
	createItem,
	createItems,
	defaultUseBy,
	deleteItem,
	itemsForBatch,
	listInventory,
	shelfSummary,
	statusFor,
	undoUse,
	updateItem,
	useByState,
	useOne
} from './inventory';
import { readItemForm } from './inventory-form';
import { emptyBody } from '../protocol-body';

const today = '2026-10-27';

function setup() {
	const db = testDb();
	const room = createSpace(db, { name: 'Basement lab', kind: 'room' });
	const shelf = createSpace(db, { name: 'Shelf B', kind: 'shelf', parentSpaceId: room.id });
	const p = createProtocol(db, {
		name: 'Salsa',
		batchType: 'preserve',
		bodyJson: { ...emptyBody(), shelfLifeMonths: 18 }
	});
	const b = createBatch(db, {
		name: 'Preserve 001 Salsa',
		protocolId: p.id,
		startedAt: '2026-10-20T09:00:00-05:00'
	});
	return { db, shelf, batch: b };
}

describe('inventory status and dates (D30, D31)', () => {
	it('follows the count: gone at 0, low at 2 or fewer', () => {
		expect(statusFor(0)).toBe('gone');
		expect(statusFor(1)).toBe('low');
		expect(statusFor(2)).toBe('low');
		expect(statusFor(2.5)).toBe('in_stock');
		expect(statusFor(12)).toBe('in_stock');
	});

	it('fills use-by from the packed date and shelf life', () => {
		expect(defaultUseBy('2026-10-27', 18)).toBe('2028-04-27');
		expect(defaultUseBy('2026-10-27', null)).toBeNull();
		expect(defaultUseBy(null, 12)).toBeNull();
	});

	it('marks past, soon (within 2 months), and fine', () => {
		expect(useByState('2026-10-26', today)).toBe('past');
		expect(useByState(today, today)).toBe('soon');
		expect(useByState('2026-12-27', today)).toBe('soon');
		expect(useByState('2026-12-28', today)).toBe('ok');
		expect(useByState(null, today)).toBeNull();
	});
});

describe('inventory items', () => {
	it('adds pints and quarts from one batch, on a shelf, with status from the count', () => {
		const { db, shelf, batch } = setup();
		const [pints, quarts] = createItems(db, [
			{ name: 'Salsa, pint', quantity: 7, unit: 'jars', spaceId: shelf.id, batchId: batch.id },
			{ name: 'Salsa, quart', quantity: 2, unit: 'jars', spaceId: shelf.id, batchId: batch.id }
		]);
		expect(pints).toMatchObject({ status: 'in_stock', batchId: batch.id });
		expect(quarts.status).toBe('low');
		const listed = itemsForBatch(db, batch.id);
		expect(listed.map((i) => [i.name, i.spacePath, i.batchName])).toEqual([
			['Salsa, pint', 'Basement lab / Shelf B', 'Preserve 001 Salsa'],
			['Salsa, quart', 'Basement lab / Shelf B', 'Preserve 001 Salsa']
		]);
	});

	it('writes none when one row is bad', () => {
		const { db } = setup();
		expect(() =>
			createItems(db, [
				{ name: 'Salsa, pint', quantity: 7 },
				{ name: '', quantity: 2 }
			])
		).toThrow(/name/);
		expect(listInventory(db, { includeGone: true })).toEqual([]);
	});

	it('takes outside items with no batch and no count', () => {
		const { db } = setup();
		const honey = createItem(db, { name: "Neighbor's honey", status: 'low' });
		expect(honey).toMatchObject({ batchId: null, quantity: null, status: 'low' });
	});

	it('rejects bad counts and dates', () => {
		const { db } = setup();
		expect(() => createItem(db, { name: 'x', quantity: -1 })).toThrow(/negative/);
		expect(() => createItem(db, { name: 'x', useBy: '2026-02-30' })).toThrow(/not a real date/);
		expect(() => createItem(db, { name: 'x', packedAt: today, useBy: '2026-01-01' })).toThrow(
			/before the packed date/
		);
		expect(() => createItem(db, { name: 'x', batchId: 'bat_missing000' })).toThrow(/no longer/);
	});

	it('Used one counts down to gone, and Undo puts back what was there', () => {
		const { db } = setup();
		const item = createItem(db, { name: 'Dill pickles, quart', quantity: 3, unit: 'jars' });
		expect(useOne(db, item.id).item).toMatchObject({ quantity: 2, status: 'low' });
		useOne(db, item.id);
		const last = useOne(db, item.id);
		expect(last).toMatchObject({ before: 1, item: { quantity: 0, status: 'gone' } });
		expect(() => useOne(db, item.id)).toThrow(/already gone/);
		expect(undoUse(db, item.id, last.before)).toMatchObject({ quantity: 1, status: 'low' });

		const beef = createItem(db, { name: 'Ground beef', quantity: 0.5, unit: 'lb' });
		const used = useOne(db, beef.id);
		expect(used.item.quantity).toBe(0);
		expect(undoUse(db, beef.id, used.before).quantity).toBe(0.5);
	});

	it('hides gone items unless asked, and edits move an item', () => {
		const { db, shelf } = setup();
		const a = createItem(db, { name: 'Applesauce', quantity: 0 });
		const b = createItem(db, { name: 'Beets', quantity: 4 });
		expect(listInventory(db).map((i) => i.name)).toEqual(['Beets']);
		expect(listInventory(db, { includeGone: true }).map((i) => i.name)).toEqual([
			'Applesauce',
			'Beets'
		]);
		updateItem(db, b.id, { name: 'Pickled beets', quantity: 4, spaceId: shelf.id });
		expect(listInventory(db, { spaceId: shelf.id }).map((i) => i.name)).toEqual(['Pickled beets']);
		deleteItem(db, a.id);
		expect(listInventory(db, { includeGone: true })).toHaveLength(1);
	});

	it('lists what is past or near its use-by for Today, oldest first', () => {
		const { db } = setup();
		createItem(db, { name: 'Old jam', quantity: 2, useBy: '2026-09-01' });
		createItem(db, { name: 'Older jam', quantity: 1, useBy: '2026-03-01' });
		createItem(db, { name: 'Kraut', quantity: 1, useBy: '2026-11-15' });
		createItem(db, { name: 'Salsa', quantity: 7, useBy: '2028-04-27' });
		createItem(db, { name: 'Gone jam', quantity: 0, useBy: '2026-01-01' });
		const s = shelfSummary(db, today);
		expect(s.past.map((i) => i.name)).toEqual(['Older jam', 'Old jam']);
		expect(s.soon.map((i) => i.name)).toEqual(['Kraut']);
	});

	it('keeps items when their batch is deleted', () => {
		const { db, batch } = setup();
		const item = createItem(db, { name: 'Salsa, pint', quantity: 7, batchId: batch.id });
		db.$client.prepare('delete from task where batch_id = ?').run(batch.id);
		db.$client.prepare('delete from batch where id = ?').run(batch.id);
		expect(listInventory(db)[0]).toMatchObject({ id: item.id, batchId: null, batchName: null });
	});
});

describe('shelf item form', () => {
	it('reads the fields, with blanks as null', () => {
		const fd = new FormData();
		for (const [k, v] of Object.entries({
			name: ' Salsa, pint ',
			quantity: '7',
			unit: 'jars',
			spaceId: '',
			packedAt: '2026-10-27',
			useBy: '2028-04-27',
			status: 'bogus'
		}))
			fd.set(k, v);
		expect(readItemForm(fd)).toEqual({
			name: 'Salsa, pint',
			quantity: 7,
			unit: 'jars',
			spaceId: null,
			packedAt: '2026-10-27',
			useBy: '2028-04-27',
			batchId: null,
			status: null
		});
	});
});
