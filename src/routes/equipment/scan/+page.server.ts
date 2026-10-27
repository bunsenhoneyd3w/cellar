import { fail, redirect } from '@sveltejs/kit';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { getDb } from '#lib/server/db/index.ts';
import { saveScannedEquipment } from '#lib/server/equipment.ts';
import { listSpaces } from '#lib/server/spaces.ts';
import { savePhoto } from '#lib/server/photos.ts';
import { photosDir } from '#lib/server/paths.ts';
import { recognitionOn, recognizeEquipment, type ScanResult } from '#lib/server/recognize.ts';
import { readScanForm, type ScanReview } from '#lib/server/scan-form.ts';
import { InputError, str } from '#lib/server/form.ts';
import { blankReviewItem, toReview } from '#lib/equipment-scan.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({
	spaces: listSpaces(getDb()),
	recognitionOn: recognitionOn()
});

/** One line for the review screen when Claude did not fill it in. */
function notice(result: ScanResult): string | null {
	if (result.status === 'off')
		return 'Photo reading is off (no API key), so fill this in yourself.';
	if (result.status === 'failed') return `${result.message} Fill this in yourself.`;
	if (!result.items.length) return 'No equipment found in this photo. Add it yourself.';
	return null;
}

export const actions: Actions = {
	// Step 1: save the photo, ask Claude what is in it, and hand back the review.
	read: async ({ request }) => {
		const fd = await request.formData();
		// The camera and library buttons are two inputs with one name; one of them is empty.
		const file = fd.getAll('photo').find((f): f is File => f instanceof File && f.size > 0);
		if (!file) return fail(400, { error: 'Pick a photo.' });

		const saved = await savePhoto(new Uint8Array(await file.arrayBuffer()), file.name, file.type);
		// savePhoto makes a resized JPEG unless the format could not be read (a HEIC, say).
		const result: ScanResult = saved.path.endsWith('.jpg')
			? await recognizeEquipment(readFileSync(path.join(photosDir(), saved.path)))
			: { status: 'failed', message: 'This photo format could not be read.' };
		const items = result.status === 'ok' ? toReview(result.items) : [];
		const review: ScanReview = {
			photo: { path: saved.path, originalPath: saved.originalPath },
			spaceId: str(fd, 'spaceId'),
			items: items.length ? items : [blankReviewItem()]
		};
		return { review, notice: notice(result) };
	},

	// Step 2: save what Seth ticked. On a problem, show the review again with his edits.
	save: async ({ request }) => {
		const review = readScanForm(await request.formData());
		try {
			saveScannedEquipment(getDb(), review);
		} catch (e) {
			if (e instanceof InputError) return fail(400, { review, notice: null, error: e.message });
			throw e;
		}
		redirect(303, '/equipment');
	}
};
