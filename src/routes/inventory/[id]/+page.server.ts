import { error, redirect } from '@sveltejs/kit';
import { getDb } from '#lib/server/db/index.ts';
import { getBatch } from '#lib/server/batches.ts';
import { deleteItem, getItem, updateItem } from '#lib/server/inventory.ts';
import { readItemForm } from '#lib/server/inventory-form.ts';
import { listSpaces } from '#lib/server/spaces.ts';
import { inputFail } from '#lib/server/actions.ts';
import { shelvesFirst } from '#lib/shelf.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const db = getDb();
	const item = getItem(db, params.id);
	if (!item) error(404, 'Item not found');
	const b = item.batchId ? getBatch(db, item.batchId) : undefined;
	return {
		item,
		batch: b ? { id: b.id, name: b.name } : null,
		shelfLifeMonths: b?.protocolSnapshotJson?.body.shelfLifeMonths ?? null,
		spaces: shelvesFirst(listSpaces(db))
	};
};

export const actions: Actions = {
	save: async ({ request, params }) => {
		const db = getDb();
		const input = readItemForm(await request.formData());
		try {
			// The batch link is not on the form; keep it as it was.
			updateItem(db, params.id, { ...input, batchId: getItem(db, params.id)?.batchId ?? null });
		} catch (e) {
			return inputFail(e);
		}
		redirect(303, '/inventory');
	},

	delete: ({ params }) => {
		deleteItem(getDb(), params.id);
		redirect(303, '/inventory');
	}
};
