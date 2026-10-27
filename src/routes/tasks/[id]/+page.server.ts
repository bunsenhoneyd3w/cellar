import { error, redirect } from '@sveltejs/kit';
import { getDb } from '#lib/server/db/index.ts';
import { listBatches } from '#lib/server/batches.ts';
import { deleteTask, getTask, updateTask } from '#lib/server/tasks.ts';
import { backTo, readTaskForm } from '#lib/server/task-form.ts';
import { str } from '#lib/server/form.ts';
import { inputFail } from '#lib/server/actions.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, url }) => {
	const db = getDb();
	const task = getTask(db, params.id);
	if (!task) error(404, 'Task not found');
	// Running batches, plus this task's own batch even if it has finished.
	const batches = listBatches(db).filter(
		(b) => b.status === 'active' || b.status === 'planned' || b.id === task.batchId
	);
	return {
		task,
		batches: batches.map((b) => ({ id: b.id, name: b.name })),
		from: url.searchParams.get('from') === 'batch' ? 'batch' : 'today'
	};
};

export const actions: Actions = {
	save: async ({ request, params }) => {
		const fd = await request.formData();
		let batchId: string | null;
		try {
			batchId = updateTask(getDb(), params.id, readTaskForm(fd)).batchId;
		} catch (e) {
			return inputFail(e);
		}
		redirect(303, backTo(str(fd, 'from'), batchId));
	},

	delete: async ({ request, params }) => {
		const fd = await request.formData();
		const db = getDb();
		const batchId = getTask(db, params.id)?.batchId;
		deleteTask(db, params.id);
		redirect(303, backTo(str(fd, 'from'), batchId));
	}
};
