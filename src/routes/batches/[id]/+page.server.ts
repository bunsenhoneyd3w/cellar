import { error, fail } from '@sveltejs/kit';
import { getDb } from '#lib/server/db/index.ts';
import { getBatchDetail, listBatches } from '#lib/server/batches.ts';
import { deleteObservation, getObservation } from '#lib/server/observations.ts';
import { deletePhotoFiles } from '#lib/server/photos.ts';
import { reopenBatch } from '#lib/server/outcomes.ts';
import { str } from '#lib/server/form.ts';
import { listOpenTasks } from '#lib/server/tasks.ts';
import { itemsForBatch } from '#lib/server/inventory.ts';
import { taskActions } from '#lib/server/task-actions.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const detail = getBatchDetail(getDb(), params.id);
	if (!detail) error(404, 'Batch not found');
	return {
		...detail,
		tasks: listOpenTasks(getDb(), { batchId: params.id }),
		shelfItems: itemsForBatch(getDb(), params.id),
		// Compare is offered once there is another batch of the same type (D40).
		sameType: listBatches(getDb(), { type: detail.batch.batchType }).length
	};
};

export const actions: Actions = {
	...taskActions,

	deleteObservation: async ({ request, params }) => {
		const db = getDb();
		const id = str(await request.formData(), 'observationId') ?? '';
		const obs = getObservation(db, id);
		if (!obs || obs.batchId !== params.id) return fail(404, { error: 'Observation not found.' });
		deletePhotoFiles(deleteObservation(db, id));
		return { deleted: true };
	},

	reopen: ({ params }) => {
		reopenBatch(getDb(), params.id);
		return { reopened: true };
	}
};
