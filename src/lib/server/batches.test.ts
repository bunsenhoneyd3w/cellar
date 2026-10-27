import { describe, expect, it } from 'vitest';
import { testDb } from './db/test-helpers';
import { createProtocol, reviseProtocol } from './protocols';
import { createSpace } from './spaces';
import { createEquipment } from './equipment';
import {
	batchName,
	createBatch,
	getBatch,
	getBatchDetail,
	listBatches,
	nextBatchNumber,
	updateBatch
} from './batches';
import { emptyBody } from '../protocol-body';
import { toIso } from '../time';

function setup() {
	const db = testDb();
	const p = createProtocol(db, {
		name: 'Classic sauerkraut',
		batchType: 'ferment',
		bodyJson: { ...emptyBody(), ingredients: ['1 cabbage', '2% salt'], expectedDays: 21 }
	});
	return { db, p };
}

describe('batches', () => {
	it('copies the protocol into the batch and ignores later protocol edits', () => {
		const { db, p } = setup();
		const b = createBatch(db, { name: 'Ferment 001 Classic sauerkraut', protocolId: p.id });
		expect(b.protocolSnapshotJson).toMatchObject({
			protocolId: p.id,
			version: 1,
			name: 'Classic sauerkraut',
			body: { ingredients: ['1 cabbage', '2% salt'], expectedDays: 21 }
		});

		reviseProtocol(db, p.id, {
			name: 'Sauerkraut with caraway',
			batchType: 'ferment',
			bodyJson: {
				...emptyBody(),
				ingredients: ['1 cabbage', '2% salt', 'caraway'],
				expectedDays: 28
			}
		});

		const again = getBatch(db, b.id);
		expect(again?.protocolSnapshotJson?.name).toBe('Classic sauerkraut');
		expect(again?.protocolSnapshotJson?.body.ingredients).toEqual(['1 cabbage', '2% salt']);
		expect(getBatchDetail(db, b.id)?.latestProtocol?.version).toBe(2);
	});

	it('takes its type from the protocol and starts active, or planned if the start is ahead', () => {
		const { db, p } = setup();
		const now = createBatch(db, { name: 'A', protocolId: p.id });
		expect(now).toMatchObject({ batchType: 'ferment', status: 'active' });
		const later = createBatch(db, {
			name: 'B',
			protocolId: p.id,
			startedAt: toIso(new Date(Date.now() + 3 * 86_400_000))
		});
		expect(later.status).toBe('planned');
	});

	it('numbers batches per type', () => {
		const { db, p } = setup();
		expect(nextBatchNumber(db, 'ferment')).toBe(1);
		createBatch(db, { name: batchName('ferment', 1, p.name), protocolId: p.id });
		expect(nextBatchNumber(db, 'ferment')).toBe(2);
		expect(batchName('ferment', 2, p.name)).toBe('Ferment 002 Classic sauerkraut');
		expect(nextBatchNumber(db, 'mushroom')).toBe(1);
	});

	it('links equipment and space, and edits replace the equipment list', () => {
		const { db, p } = setup();
		const shelf = createSpace(db, { name: 'Shelf', kind: 'shelf' });
		const crock = createEquipment(db, { name: 'Crock', kind: 'fermenter' });
		const weight = createEquipment(db, { name: 'Glass weight', kind: 'other' });
		const b = createBatch(db, {
			name: 'Kraut',
			protocolId: p.id,
			spaceId: shelf.id,
			equipmentIds: [crock.id, weight.id, crock.id]
		});

		let detail = getBatchDetail(db, b.id);
		expect(detail?.space?.name).toBe('Shelf');
		expect(detail?.equipment.map((e) => e.name)).toEqual(['Crock', 'Glass weight']);

		updateBatch(db, b.id, { name: 'Kraut 1', equipmentIds: [weight.id], phase: 'primary ferment' });
		detail = getBatchDetail(db, b.id);
		expect(detail?.batch).toMatchObject({
			name: 'Kraut 1',
			phase: 'primary ferment',
			spaceId: null
		});
		expect(detail?.equipment.map((e) => e.name)).toEqual(['Glass weight']);
	});

	it('lists batches filtered by status', () => {
		const { db, p } = setup();
		createBatch(db, { name: 'Active one', protocolId: p.id });
		expect(listBatches(db, { status: ['active'] })).toHaveLength(1);
		expect(listBatches(db, { status: ['done', 'failed'] })).toHaveLength(0);
		expect(listBatches(db)[0]).toMatchObject({
			name: 'Active one',
			observationCount: 0,
			lastObservedAt: null
		});
	});

	it('refuses a batch without a protocol or a name', () => {
		const { db, p } = setup();
		expect(() => createBatch(db, { name: 'X', protocolId: 'pro_missing000' })).toThrow(/protocol/);
		expect(() => createBatch(db, { name: ' ', protocolId: p.id })).toThrow(/name/);
	});
});
