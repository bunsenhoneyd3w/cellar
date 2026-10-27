import { recurrenceFromPicker } from '../recurrence';
import { num, str } from './form';
import type { TaskInput } from './tasks';

/** Reads the add/edit task form. */
export function readTaskForm(fd: FormData): TaskInput {
	return {
		title: str(fd, 'title') ?? '',
		batchId: str(fd, 'batchId'),
		dueAt: str(fd, 'dueAt'),
		recurrence: recurrenceFromPicker(str(fd, 'repeat'), num(fd, 'everyDays')),
		repeatUntil: str(fd, 'repeatUntil')
	};
}

/**
 * Where to go after saving: back to the batch page when the task was opened
 * from there, otherwise Today. Only these two, so the link cannot send the
 * browser anywhere else.
 */
export function backTo(from: string | null, batchId: string | null | undefined): string {
	return from === 'batch' && batchId ? `/batches/${batchId}` : '/';
}
