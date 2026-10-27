import { error, redirect } from '@sveltejs/kit';
import { getDb } from '#lib/server/db/index.ts';
import { getBatchDetail } from '#lib/server/batches.ts';
import { finishBatch } from '#lib/server/outcomes.ts';
import { suggestedYield } from '#lib/server/grows.ts';
import { readShelfRows } from '#lib/server/inventory-form.ts';
import { listSpaces } from '#lib/server/spaces.ts';
import { listOpenTasks } from '#lib/server/tasks.ts';
import { defaultUseBy, shelvesFirst } from '#lib/shelf.ts';
import { bodyProcessing } from '#lib/protocol-body.ts';
import { harvestWord } from '#lib/enums.ts';
import { num, oneOf, str } from '#lib/server/form.ts';
import { inputFail } from '#lib/server/actions.ts';
import { fromLocalInput, localDate, toLocalInput } from '#lib/time.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, url }) => {
	const detail = getBatchDetail(getDb(), params.id);
	if (!detail) error(404, 'Batch not found');
	return {
		...shelfDefaults(detail.batch),
		spaces: shelvesFirst(listSpaces(getDb())),
		// Finishing hides these (D21), e.g. a seal check due tomorrow.
		openTasks: listOpenTasks(getDb(), { batchId: params.id }).map((t) => t.title),
		batch: detail.batch,
		outcome: detail.outcome,
		endedAt: toLocalInput(detail.batch.endedAt),
		// A grow's or tower's yield starts as the total of its harvests (D23, D36); it can still be changed.
		suggested: detail.outcome?.yieldValue == null ? suggestedYield(detail.flushes) : null,
		flushCount: detail.flushes.flushes.length,
		flushWord: harvestWord(detail.batch.batchType, detail.flushes.flushes.length),
		failed: url.searchParams.get('status') === 'failed'
	};
};

type Batch = NonNullable<ReturnType<typeof getBatchDetail>>['batch'];

/**
 * Starting rows for "Add to shelf" (D29): a preserve gets one per jar size in
 * its protocol, anything else one row. Use-by comes from the shelf life (D30),
 * counted from today; it can be changed.
 */
function shelfDefaults(b: Batch) {
	const snap = b.protocolSnapshotJson;
	const name = snap?.name ?? b.name;
	const useBy = defaultUseBy(localDate(b.endedAt ?? new Date()), snap?.body.shelfLifeMonths);
	const sizes = bodyProcessing(snap?.body)?.jars.map((j) => j.size) ?? [];
	const preserve = b.batchType === 'preserve';
	return {
		preserve,
		shelfRows: (sizes.length ? sizes.map((s) => `${name}, ${s}`) : [name]).map((n) => ({
			name: n,
			unit: 'jars',
			useBy
		}))
	};
}

export const actions: Actions = {
	default: async ({ request, params }) => {
		const fd = await request.formData();
		try {
			finishBatch(
				getDb(),
				params.id,
				{
					status: oneOf(fd, 'status', ['done', 'failed'] as const) ?? 'done',
					endedAt: fromLocalInput(str(fd, 'endedAt')),
					yieldValue: num(fd, 'yieldValue'),
					yieldUnit: str(fd, 'yieldUnit'),
					rating: num(fd, 'rating'),
					summary: str(fd, 'summary'),
					wouldChange: str(fd, 'wouldChange')
				},
				readShelfRows(fd)
			);
		} catch (e) {
			return inputFail(e);
		}
		redirect(303, `/batches/${params.id}`);
	}
};
