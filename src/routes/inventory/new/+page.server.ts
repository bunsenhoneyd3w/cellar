import { redirect } from '@sveltejs/kit';
import { getDb } from '#lib/server/db/index.ts';
import { getBatch } from '#lib/server/batches.ts';
import { createItem } from '#lib/server/inventory.ts';
import { readItemForm } from '#lib/server/inventory-form.ts';
import { listSpaces } from '#lib/server/spaces.ts';
import { inputFail } from '#lib/server/actions.ts';
import { defaultUseBy, shelvesFirst } from '#lib/shelf.ts';
import { localDate } from '#lib/time.ts';
import type { Actions, PageServerLoad } from './$types';

/** `?batch=` adds an item made by that batch (D29, D32); without it, an outside item. */
export const load: PageServerLoad = ({ url }) => {
	const db = getDb();
	const b = getBatch(db, url.searchParams.get('batch') ?? '');
	const snap = b?.protocolSnapshotJson;
	const packedAt = localDate(b?.endedAt ?? new Date());
	const shelfLifeMonths = snap?.body.shelfLifeMonths ?? null;
	return {
		batch: b ? { id: b.id, name: b.name } : null,
		shelfLifeMonths,
		values: {
			name: snap?.name ?? '',
			unit: 'jars',
			batchId: b?.id ?? null,
			packedAt,
			useBy: defaultUseBy(packedAt, shelfLifeMonths)
		},
		spaces: shelvesFirst(listSpaces(db))
	};
};

export const actions: Actions = {
	default: async ({ request }) => {
		const input = readItemForm(await request.formData());
		try {
			createItem(getDb(), input);
		} catch (e) {
			return inputFail(e);
		}
		redirect(303, input.batchId ? `/batches/${input.batchId}` : '/inventory');
	}
};
