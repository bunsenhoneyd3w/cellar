import { afterAll, describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { testDb } from './db/test-helpers';
import { equipment } from './db/schema';
import {
	addEquipmentPhoto,
	createEquipment,
	deleteEquipmentPhoto,
	listEquipment,
	listEquipmentPhotos
} from './equipment';
import { savePhoto } from './photos';

const root = mkdtempSync(path.join(tmpdir(), 'cellar-equipment-photos-'));
afterAll(() => rmSync(root, { recursive: true, force: true }));

async function photo() {
	const img = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#888' } })
		.jpeg()
		.toBuffer();
	return savePhoto(img, 'shelf.jpg', 'image/jpeg', new Date(2026, 9, 27), root);
}

describe('equipment photos', () => {
	it('adds photos to an item and shows the first one in the list', async () => {
		const db = testDb();
		const crock = createEquipment(db, { name: 'Crock 2', kind: 'fermenter' });
		createEquipment(db, { name: 'Airlocks', kind: 'other' });
		const first = await photo();
		const second = await photo();
		addEquipmentPhoto(db, crock.id, first, '2026-10-27T10:00:00-05:00');
		addEquipmentPhoto(db, crock.id, second);

		expect(listEquipmentPhotos(db, crock.id).map((p) => p.path)).toEqual([first.path, second.path]);
		expect(listEquipment(db).map((e) => [e.name, e.thumb])).toEqual([
			['Airlocks', null],
			['Crock 2', first.path]
		]);
		expect(() => addEquipmentPhoto(db, 'eqp_missing000', first)).toThrow(/no longer exists/);
	});

	it('keeps a shared photo file until the last item using it lets go', async () => {
		const db = testDb();
		const a = createEquipment(db, { name: 'Quart jars', kind: 'fermenter' });
		const b = createEquipment(db, { name: '5 gal bucket', kind: 'grow_container' });
		const shelf = await photo();
		const pa = addEquipmentPhoto(db, a.id, shelf);
		const pb = addEquipmentPhoto(db, b.id, shelf);

		deleteEquipmentPhoto(db, pa.id, root);
		expect(existsSync(path.join(root, shelf.path))).toBe(true);
		expect(listEquipmentPhotos(db, a.id)).toEqual([]);

		deleteEquipmentPhoto(db, pb.id, root);
		expect(existsSync(path.join(root, shelf.path))).toBe(false);
		expect(existsSync(path.join(root, shelf.originalPath))).toBe(false);
		expect(deleteEquipmentPhoto(db, pb.id, root)).toBeUndefined();
	});

	it('drops photo rows with their equipment', async () => {
		const db = testDb();
		const lamp = createEquipment(db, { name: 'Grow light', kind: 'light' });
		addEquipmentPhoto(db, lamp.id, await photo());
		db.delete(equipment).where(eq(equipment.id, lamp.id)).run();
		expect(listEquipmentPhotos(db, lamp.id)).toEqual([]);
	});
});
