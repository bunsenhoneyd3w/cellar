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
	discardScanPhoto,
	listEquipment,
	listEquipmentPhotos,
	saveScannedEquipment
} from './equipment';
import { savePhoto } from './photos';
import { readScanForm } from './scan-form';
import { createSpace } from './spaces';

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

describe('saving equipment from a photo', () => {
	// What the review screen posts for a shelf with jars and a bucket: the jars
	// unchanged, the bucket's estimated capacity confirmed and its height retyped,
	// and a mistaken third item unticked.
	function shelfPost(photoPath: string, originalPath: string, spaceId: string) {
		const fd = new FormData();
		const set = (k: string, v: string) => fd.set(k, v);
		set('photoPath', photoPath);
		set('photoOriginalPath', originalPath);
		set('spaceId', spaceId);
		set('itemCount', '3');

		set('0_keep', 'on');
		set('0_name', 'Ball quart jar');
		set('0_brand', 'Ball');
		set('0_kind', 'fermenter');
		set('0_count', '12');
		set('0_sizeCount', '1');
		set('0_s_0_name', 'capacity');
		set('0_s_0_unit', 'qt');
		set('0_s_0_value', '1');
		set('0_s_0_original', '1');
		set('0_s_0_source', 'label');

		set('1_keep', 'on');
		set('1_name', '5 gal bucket');
		set('1_kind', 'grow_container');
		set('1_count', '1');
		set('1_sizeCount', '2');
		set('1_s_0_name', 'capacity');
		set('1_s_0_unit', 'gal');
		set('1_s_0_value', '5');
		set('1_s_0_original', '5');
		set('1_s_0_source', 'estimate');
		set('1_s_0_ok', 'on');
		set('1_s_1_name', 'height');
		set('1_s_1_unit', 'in');
		set('1_s_1_value', '15');
		set('1_s_1_original', '14');
		set('1_s_1_source', 'estimate');

		set('2_name', 'Shadow');
		set('2_kind', 'other');
		set('2_sizeCount', '0');
		return fd;
	}

	it('saves the ticked items with their specs and the shared photo', async () => {
		const db = testDb();
		const shelf = createSpace(db, { name: 'Shelf B', kind: 'shelf' });
		const pic = await photo();
		const review = readScanForm(shelfPost(pic.path, pic.originalPath, shelf.id));
		expect(review.items.map((it) => it.keep)).toEqual([true, true, false]);

		const saved = saveScannedEquipment(db, review, root);
		expect(saved.map((e) => [e.name, e.kind, e.spaceId])).toEqual([
			['Ball quart jar', 'fermenter', shelf.id],
			['5 gal bucket', 'grow_container', shelf.id]
		]);
		expect(saved[0].specsJson).toEqual({
			brand: 'Ball',
			count: 12,
			capacity_qt: 1,
			capacity_qt_source: 'label'
		});
		expect(saved[1].specsJson).toEqual({
			capacity_gal: 5,
			capacity_gal_source: 'estimate',
			height_in: 15,
			height_in_source: 'entered'
		});
		for (const e of saved) {
			expect(listEquipmentPhotos(db, e.id).map((p) => p.path)).toEqual([pic.path]);
		}
	});

	it('refuses unconfirmed estimates, nothing ticked, or a photo it did not save', async () => {
		const db = testDb();
		const pic = await photo();
		const fd = shelfPost(pic.path, pic.originalPath, '');
		fd.delete('1_s_0_ok');
		expect(() => saveScannedEquipment(db, readScanForm(fd), root)).toThrow(
			'Confirm or fix the estimated sizes on: 5 gal bucket.'
		);

		const none = readScanForm(shelfPost(pic.path, pic.originalPath, ''));
		none.items.forEach((it) => (it.keep = false));
		expect(() => saveScannedEquipment(db, none, root)).toThrow(/Tick at least one/);

		const outside = readScanForm(shelfPost('../../etc/passwd', pic.originalPath, ''));
		expect(() => saveScannedEquipment(db, outside, root)).toThrow(/photo is missing/);
		expect(listEquipment(db)).toEqual([]);
	});
});

describe('discarding an unsaved photo review', () => {
	it('deletes the files only when nothing uses them', async () => {
		const db = testDb();
		const unused = await photo();
		expect(discardScanPhoto(db, unused, root)).toBe(true);
		expect(existsSync(path.join(root, unused.path))).toBe(false);
		expect(existsSync(path.join(root, unused.originalPath))).toBe(false);

		const kept = await photo();
		const crock = createEquipment(db, { name: 'Crock', kind: 'fermenter' });
		addEquipmentPhoto(db, crock.id, kept);
		expect(discardScanPhoto(db, kept, root)).toBe(false);
		expect(existsSync(path.join(root, kept.path))).toBe(true);

		expect(discardScanPhoto(db, { path: '../../etc/hosts', originalPath: null }, root)).toBe(false);
	});
});
