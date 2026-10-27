import { redirect } from '@sveltejs/kit';
import { getDb } from '#lib/server/db/index.ts';
import { createBatch, nextBatchNumber } from '#lib/server/batches.ts';
import { listProtocols } from '#lib/server/protocols.ts';
import { listSpaces } from '#lib/server/spaces.ts';
import { listEquipment } from '#lib/server/equipment.ts';
import { readBatchForm } from '#lib/server/batch-form.ts';
import { inputFail } from '#lib/server/actions.ts';
import { toLocalInput } from '#lib/time.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
	const db = getDb();
	return {
		protocols: listProtocols(db, 'ferment'),
		protocolId: url.searchParams.get('protocol'),
		nextNumber: nextBatchNumber(db, 'ferment'),
		spaces: listSpaces(db),
		equipment: listEquipment(db),
		startedAt: toLocalInput(null)
	};
};

export const actions: Actions = {
	default: async ({ request }) => {
		const fd = await request.formData();
		let id: string;
		try {
			id = createBatch(getDb(), readBatchForm(fd)).id;
		} catch (e) {
			return inputFail(e);
		}
		redirect(303, `/batches/${id}`);
	}
};
