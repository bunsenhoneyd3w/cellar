import { describe, expect, it } from 'vitest';
import { testDb } from './db/test-helpers';
import { createSpace, listSpaces, updateSpace } from './spaces';
import {
	createEquipment,
	formatSpecs,
	listEquipment,
	parseSpecs,
	updateEquipment
} from './equipment';

describe('spaces', () => {
	it('nests spaces and lists them as a tree with paths', () => {
		const db = testDb();
		const lab = createSpace(db, { name: 'Basement lab', kind: 'room' });
		createSpace(db, { name: 'Shelf B', kind: 'shelf', parentSpaceId: lab.id });
		createSpace(db, { name: 'Chest freezer', kind: 'appliance' });

		const list = listSpaces(db);
		expect(list.map((s) => [s.path, s.depth])).toEqual([
			['Basement lab', 0],
			['Basement lab / Shelf B', 1],
			['Chest freezer', 0]
		]);
	});

	it('updates a space and bumps updated_at only', async () => {
		const db = testDb();
		const s = createSpace(db, { name: 'Shelf', kind: 'shelf' });
		await new Promise((r) => setTimeout(r, 1100));
		const u = updateSpace(db, s.id, { name: 'Shelf A', kind: 'shelf', notes: 'Top shelf' });
		expect(u.name).toBe('Shelf A');
		expect(u.createdAt).toBe(s.createdAt);
		expect(u.updatedAt > s.updatedAt).toBe(true);
	});

	it('refuses a loop where a space sits inside its own child', () => {
		const db = testDb();
		const lab = createSpace(db, { name: 'Lab', kind: 'room' });
		const bin = createSpace(db, { name: 'Bin', kind: 'container', parentSpaceId: lab.id });
		expect(() =>
			updateSpace(db, lab.id, { name: 'Lab', kind: 'room', parentSpaceId: bin.id })
		).toThrow(/inside itself/);
		expect(() => createSpace(db, { name: '', kind: 'room' })).toThrow(/name/);
	});
});

describe('equipment', () => {
	it('stores specs typed and lists with the home space name', () => {
		const db = testDb();
		const lab = createSpace(db, { name: 'Basement lab', kind: 'room' });
		const crock = createEquipment(db, {
			name: '1 gal crock',
			kind: 'fermenter',
			specsJson: parseSpecs('capacity_gal: 1\nmaterial: stoneware'),
			spaceId: lab.id
		});
		expect(crock.specsJson).toEqual({ capacity_gal: 1, material: 'stoneware' });
		expect(listEquipment(db)[0].spaceName).toBe('Basement lab');

		const moved = updateEquipment(db, crock.id, {
			name: '1 gal crock',
			kind: 'fermenter',
			spaceId: null
		});
		expect(moved.spaceId).toBeNull();
	});

	it('round trips specs text', () => {
		const specs = parseSpecs('max psi: 15\n\nmodel year: 2019\nnote');
		expect(specs).toEqual({ 'max psi': 15, 'model year': 2019, note: '' });
		expect(formatSpecs(specs)).toBe('max psi: 15\nmodel year: 2019\nnote: ');
		expect(parseSpecs('')).toBeNull();
	});
});
