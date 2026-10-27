import { error, fail } from '@sveltejs/kit';
import { getDb } from '#lib/server/db/index.ts';
import { getBatchDetail } from '#lib/server/batches.ts';
import { deleteObservation, getObservation } from '#lib/server/observations.ts';
import { deletePhotoFiles } from '#lib/server/photos.ts';
import { str } from '#lib/server/form.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const detail = getBatchDetail(getDb(), params.id);
	if (!detail) error(404, 'Batch not found');
	return detail;
};

export const actions: Actions = {
	deleteObservation: async ({ request, params }) => {
		const db = getDb();
		const id = str(await request.formData(), 'observationId') ?? '';
		const obs = getObservation(db, id);
		if (!obs || obs.batchId !== params.id) return fail(404, { error: 'Observation not found.' });
		deletePhotoFiles(deleteObservation(db, id));
		return { deleted: true };
	}
};
