import { kindsFor } from '../reading-kinds';
import type { ProtocolBody, TargetRange, TaskTemplate } from '../protocol-body';
import { recurrenceDays, recurrenceFor, recurrenceFromPicker } from '../recurrence';
import { lines, num, str } from './form';
import type { ProtocolInput } from './protocols';

/**
 * Reads the protocol form. `base` is the body being edited, so fields the form
 * does not show (such as the Paprika uid) carry over to the new version.
 */
export function readProtocolForm(fd: FormData, base?: ProtocolBody): ProtocolInput {
	const targets: TargetRange[] = [];
	for (const k of kindsFor('ferment')) {
		const min = num(fd, `min_${k.kind}`);
		const max = num(fd, `max_${k.kind}`);
		if (min !== null || max !== null) targets.push({ kind: k.kind, min, max, unit: k.unit });
	}
	const tasks = readTaskTemplates(fd);
	return {
		name: str(fd, 'name') ?? '',
		batchType: 'ferment',
		source: str(fd, 'source'),
		notes: str(fd, 'notes'),
		bodyJson: {
			...base,
			ingredients: lines(str(fd, 'ingredients')),
			steps: lines(str(fd, 'steps')),
			targets,
			expectedDays: num(fd, 'expectedDays'),
			servings: str(fd, 'servings'),
			sourceUrl: str(fd, 'sourceUrl'),
			// Left off entirely when empty, so saving an old protocol unchanged makes no new version.
			tasks: tasks.length ? tasks : undefined
		}
	};
}

const MAX_TASK_ROWS = 50;

/** Reads the task_<n>_<field> rows; rows without a name are skipped. */
function readTaskTemplates(fd: FormData): TaskTemplate[] {
	const count = Math.min(num(fd, 'taskCount') ?? 0, MAX_TASK_ROWS);
	const tasks: TaskTemplate[] = [];
	for (let i = 0; i < count; i++) {
		const title = str(fd, `task_${i}_title`);
		if (!title) continue;
		const picked = recurrenceFromPicker(str(fd, `task_${i}_repeat`), num(fd, `task_${i}_every`));
		const days = recurrenceDays(picked);
		// An unreadable repeat is kept as typed so the protocol check can explain it.
		const recurrence = picked && days !== null ? recurrenceFor(days) : picked;
		tasks.push({
			title,
			startDay: num(fd, `task_${i}_start`) ?? 0,
			recurrence,
			endDay: recurrence ? num(fd, `task_${i}_end`) : null
		});
	}
	return tasks;
}
