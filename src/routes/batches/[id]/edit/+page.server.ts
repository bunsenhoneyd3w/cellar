import { error, redirect } from '@sveltejs/kit';
import { getDb } from '#lib/server/db/index.ts';
import { getBatchDetail, updateBatch } from '#lib/server/batches.ts';
import { listSpaces } from '#lib/server/spaces.ts';
import { listEquipment } from '#lib/server/equipment.ts';
import { readBatchForm } from '#lib/server/batch-form.ts';
import { inputFail } from '#lib/server/actions.ts';
import { toLocalInput } from '#lib/time.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const db = getDb();
	const detail = getBatchDetail(db, params.id);
	if (!detail) error(404, 'Batch not found');
	return {
		batch: detail.batch,
		equipmentIds: detail.equipmentIds,
		startedAt: toLocalInput(detail.batch.startedAt),
		spaces: listSpaces(db),
		equipment: listEquipment(db)
	};
};

export const actions: Actions = {
	default: async ({ request, params }) => {
		const fd = await request.formData();
		try {
			updateBatch(getDb(), params.id, readBatchForm(fd));
		} catch (e) {
			return inputFail(e);
		}
		redirect(303, `/batches/${params.id}`);
	}
};
