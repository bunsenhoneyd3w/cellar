import { describe, expect, it } from 'vitest';
import { testDb } from './db/test-helpers';
import { setupProgress } from './setup';
import { createSpace } from './spaces';
import { createEquipment } from './equipment';
import { createProtocol } from './protocols';
import { createBatch } from './batches';
import { emptyBody } from '../protocol-body';

describe('setup progress', () => {
	it('ticks each step off as the data appears', () => {
		const db = testDb();
		expect(setupProgress(db)).toEqual({
			space: false,
			equipment: false,
			protocol: false,
			batch: false
		});
		createSpace(db, { name: 'Basement lab', kind: 'room' });
		createEquipment(db, { name: 'Crock', kind: 'fermenter' });
		const p = createProtocol(db, { name: 'Kraut', batchType: 'ferment', bodyJson: emptyBody() });
		expect(setupProgress(db)).toEqual({
			space: true,
			equipment: true,
			protocol: true,
			batch: false
		});
		createBatch(db, { name: 'Ferment 001 Kraut', protocolId: p.id });
		expect(setupProgress(db).batch).toBe(true);
	});
});
