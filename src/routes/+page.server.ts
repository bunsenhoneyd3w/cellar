import { getDb } from '#lib/server/db/index.ts';
import { listBatches } from '#lib/server/batches.ts';
import { todayTasks } from '#lib/server/tasks.ts';
import { taskActions } from '#lib/server/task-actions.ts';
import { localDate } from '#lib/time.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const db = getDb();
	const today = localDate();
	return {
		today,
		tasks: todayTasks(db, today),
		batches: listBatches(db, { status: ['active', 'planned'] })
	};
};

export const actions: Actions = { ...taskActions };
