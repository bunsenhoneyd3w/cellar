import { redirect } from '@sveltejs/kit';
import { getDb } from '#lib/server/db/index.ts';
import { listBatches } from '#lib/server/batches.ts';
import { createTask } from '#lib/server/tasks.ts';
import { backTo, readTaskForm } from '#lib/server/task-form.ts';
import { str } from '#lib/server/form.ts';
import { inputFail } from '#lib/server/actions.ts';
import { localDate } from '#lib/time.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
	const batches = listBatches(getDb(), { status: ['active', 'planned'] });
	const wanted = url.searchParams.get('batch');
	return {
		batches: batches.map((b) => ({ id: b.id, name: b.name })),
		batchId: batches.some((b) => b.id === wanted) ? wanted : null,
		from: url.searchParams.get('from') === 'batch' ? 'batch' : 'today',
		today: localDate()
	};
};

export const actions: Actions = {
	save: async ({ request }) => {
		const fd = await request.formData();
		let batchId: string | null;
		try {
			batchId = createTask(getDb(), readTaskForm(fd)).batchId;
		} catch (e) {
			return inputFail(e);
		}
		redirect(303, backTo(str(fd, 'from'), batchId));
	}
};
