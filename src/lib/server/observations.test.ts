import { afterAll, describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { testDb } from './db/test-helpers';
import { createProtocol } from './protocols';
import { createBatch, getBatch, getBatchDetail } from './batches';
import { createObservation, deleteObservation } from './observations';
import { deletePhotoFiles, MAX_DIMENSION, resolveInside, savePhoto } from './photos';
import { emptyBody } from '../protocol-body';

const root = mkdtempSync(path.join(tmpdir(), 'cellar-photos-'));
afterAll(() => rmSync(root, { recursive: true, force: true }));

function setup() {
	const db = testDb();
	const p = createProtocol(db, { name: 'Kraut', batchType: 'ferment', bodyJson: emptyBody() });
	const b = createBatch(db, {
		name: 'Ferment 001 Kraut',
		protocolId: p.id,
		phase: 'primary ferment'
	});
	return { db, b };
}

describe('observations', () => {
	it('saves readings as typed rows with their units', () => {
		const { db, b } = setup();
		const obs = createObservation(db, {
			batchId: b.id,
			observedAt: '2026-10-27T08:00:00-05:00',
			note: 'Lively bubbling',
			readings: [
				{ kind: 'ph', value: 3.8, unit: 'pH' },
				{ kind: 'temp_air', value: 66.5, unit: '°F' }
			]
		});
		const detail = getBatchDetail(db, b.id)!;
		expect(detail.observations).toHaveLength(1);
		expect(detail.observations[0]).toMatchObject({
			id: obs.id,
			phase: 'primary ferment',
			note: 'Lively bubbling'
		});
		expect(detail.readings.map((r) => [r.kind, r.value, r.unit, r.takenAt, r.source])).toEqual([
			['ph', 3.8, 'pH', '2026-10-27T08:00:00-05:00', 'manual'],
			['temp_air', 66.5, '°F', '2026-10-27T08:00:00-05:00', 'manual']
		]);
	});

	it('moves the batch to a new phase', () => {
		const { db, b } = setup();
		createObservation(db, { batchId: b.id, note: 'Bottled', phase: 'conditioning' });
		expect(getBatch(db, b.id)?.phase).toBe('conditioning');
	});

	it('refuses an empty check-in, unknown kinds, and bad numbers', () => {
		const { db, b } = setup();
		expect(() => createObservation(db, { batchId: b.id })).toThrow(/note, a reading, or a photo/);
		expect(() =>
			createObservation(db, { batchId: b.id, readings: [{ kind: 'vibes', value: 1, unit: 'x' }] })
		).toThrow(/Unknown reading kind/);
		expect(() =>
			createObservation(db, { batchId: b.id, readings: [{ kind: 'ph', value: NaN, unit: 'pH' }] })
		).toThrow(/not a number/);
	});
});

describe('photos', () => {
	it('keeps the original and writes a resized JPEG no larger than the max', async () => {
		const big = await sharp({
			create: { width: 3000, height: 2000, channels: 3, background: { r: 200, g: 60, b: 40 } }
		})
			.png()
			.toBuffer();
		const saved = await savePhoto(big, 'IMG_0001.PNG', 'image/png', new Date(2026, 9, 27), root);

		expect(saved.path).toBe(path.join('2026', '10', `${saved.id}.jpg`));
		expect(saved.originalPath).toBe(path.join('originals', '2026', '10', `${saved.id}.png`));
		const meta = await sharp(path.join(root, saved.path)).metadata();
		expect(Math.max(meta.width!, meta.height!)).toBe(MAX_DIMENSION);
		expect(meta.format).toBe('jpeg');
		expect(existsSync(path.join(root, saved.originalPath))).toBe(true);
	});

	it('keeps a file it cannot decode as the photo itself', async () => {
		const saved = await savePhoto(
			new Uint8Array([1, 2, 3, 4]),
			'IMG_0002.HEIC',
			'image/heic',
			new Date(),
			root
		);
		expect(saved.path).toBe(saved.originalPath);
		expect(saved.path.endsWith('.heic')).toBe(true);
	});

	it('links photos to an observation and deleting it removes the files', async () => {
		const { db, b } = setup();
		const img = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#888' } })
			.jpeg()
			.toBuffer();
		const saved = await savePhoto(img, 'a.jpg', 'image/jpeg', new Date(), root);
		const obs = createObservation(db, { batchId: b.id, photos: [saved] });

		expect(getBatchDetail(db, b.id)!.observations[0].photos[0]).toMatchObject({
			id: saved.id,
			path: saved.path
		});

		deletePhotoFiles(deleteObservation(db, obs.id), root);
		expect(getBatchDetail(db, b.id)!.observations).toHaveLength(0);
		expect(existsSync(path.join(root, saved.path))).toBe(false);
		expect(existsSync(path.join(root, saved.originalPath))).toBe(false);
	});

	it('never resolves a path outside the photos folder', () => {
		expect(resolveInside(root, '../secrets.txt')).toBeNull();
		expect(resolveInside(root, '/etc/passwd')).toBeNull();
		expect(resolveInside(root, '2026/10/pho_x.jpg')).toBe(path.join(root, '2026/10/pho_x.jpg'));
	});
});
