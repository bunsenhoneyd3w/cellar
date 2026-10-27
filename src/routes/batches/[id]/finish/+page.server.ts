import { error, redirect } from '@sveltejs/kit';
import { getDb } from '#lib/server/db/index.ts';
import { getBatchDetail } from '#lib/server/batches.ts';
import { finishBatch } from '#lib/server/outcomes.ts';
import { suggestedYield } from '#lib/server/grows.ts';
import { num, oneOf, str } from '#lib/server/form.ts';
import { inputFail } from '#lib/server/actions.ts';
import { fromLocalInput, toLocalInput } from '#lib/time.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, url }) => {
	const detail = getBatchDetail(getDb(), params.id);
	if (!detail) error(404, 'Batch not found');
	return {
		batch: detail.batch,
		outcome: detail.outcome,
		endedAt: toLocalInput(detail.batch.endedAt),
		// A grow's yield starts as the total of its flushes (D23); it can still be changed.
		suggested: detail.outcome?.yieldValue == null ? suggestedYield(detail.flushes) : null,
		flushCount: detail.flushes.flushes.length,
		failed: url.searchParams.get('status') === 'failed'
	};
};

export const actions: Actions = {
	default: async ({ request, params }) => {
		const fd = await request.formData();
		try {
			finishBatch(getDb(), params.id, {
				status: oneOf(fd, 'status', ['done', 'failed'] as const) ?? 'done',
				endedAt: fromLocalInput(str(fd, 'endedAt')),
				yieldValue: num(fd, 'yieldValue'),
				yieldUnit: str(fd, 'yieldUnit'),
				rating: num(fd, 'rating'),
				summary: str(fd, 'summary'),
				wouldChange: str(fd, 'wouldChange')
			});
		} catch (e) {
			return inputFail(e);
		}
		redirect(303, `/batches/${params.id}`);
	}
};
