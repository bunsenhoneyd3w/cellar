import { fail, type RequestEvent } from '@sveltejs/kit';
import { getDb } from './db';
import { completeTask, undoTask } from './tasks';
import { str } from './form';
import { inputFail } from './actions';

// Done and Undo for task rows. Any page that shows TaskRow spreads these into
// its own actions, so the row posts to the page it is on and the page reloads
// with the task gone.

async function taskId(request: Request) {
	return str(await request.formData(), 'taskId');
}

export const taskActions = {
	done: async ({ request }: RequestEvent) => {
		const id = await taskId(request);
		if (!id) return fail(400, { error: 'No task was given.' });
		try {
			const { task } = completeTask(getDb(), id);
			return { doneTask: { id: task.id, title: task.title } };
		} catch (e) {
			return inputFail(e);
		}
	},

	undo: async ({ request }: RequestEvent) => {
		const id = await taskId(request);
		if (!id) return fail(400, { error: 'No task was given.' });
		try {
			undoTask(getDb(), id);
			return { undone: true };
		} catch (e) {
			return inputFail(e);
		}
	}
};
