import { PRESERVE_METHODS, fixedPhases, isStartableType, type BatchType } from '../enums';
import { trackedKindsFor } from '../reading-kinds';
import type {
	JarTime,
	Processing,
	ProtocolBody,
	TargetRange,
	TaskTemplate
} from '../protocol-body';
import { recurrenceDays, recurrenceFor, recurrenceFromPicker } from '../recurrence';
import { lines, num, oneOf, str } from './form';
import type { ProtocolInput } from './protocols';

/**
 * Reads the protocol form. `base` is the body being edited, so fields the form
 * does not show (such as the Paprika uid) carry over to the new version.
 * `type` is the protocol's batch type when editing; a new protocol posts it.
 */
export function readProtocolForm(
	fd: FormData,
	base?: ProtocolBody,
	type?: BatchType
): ProtocolInput {
	const posted = str(fd, 'batchType');
	const batchType: BatchType = type ?? (isStartableType(posted) ? posted : 'ferment');
	const phases = fixedPhases(batchType) ?? [];

	// Targets for every phase are min_<kind>; targets for one phase add _p<index>.
	const targets: TargetRange[] = [];
	const slots: { suffix: string; phase: string | null }[] = [
		{ suffix: '', phase: null },
		...phases.map((phase, i) => ({ suffix: `_p${i}`, phase }))
	];
	for (const slot of slots) {
		for (const k of trackedKindsFor(batchType)) {
			const min = num(fd, `min_${k.kind}${slot.suffix}`);
			const max = num(fd, `max_${k.kind}${slot.suffix}`);
			if (min === null && max === null) continue;
			const t: TargetRange = { kind: k.kind, min, max, unit: k.unit };
			// The key is left off for all-phases targets so ferment bodies look as before.
			if (slot.phase) t.phase = slot.phase;
			targets.push(t);
		}
	}
	const tasks = readTaskTemplates(fd, phases);
	const preserve = batchType === 'preserve';
	return {
		name: str(fd, 'name') ?? '',
		batchType,
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
			tasks: tasks.length ? tasks : undefined,
			// Only preserves have these (D28, D30); other bodies keep their old shape.
			processing: preserve ? readProcessing(fd) : undefined,
			shelfLifeMonths: preserve ? num(fd, 'shelfLifeMonths') : undefined
		}
	};
}

const MAX_TASK_ROWS = 50;
const MAX_JAR_ROWS = 20;

/** Reads the method, headspace, and jar_<n>_<field> rows; rows without a size or time are skipped. */
function readProcessing(fd: FormData): Processing {
	const method = oneOf(fd, 'method', PRESERVE_METHODS);
	const count = Math.min(num(fd, 'jarCount') ?? 0, MAX_JAR_ROWS);
	const jars: JarTime[] = [];
	for (let i = 0; i < count; i++) {
		const size = str(fd, `jar_${i}_size`) ?? '';
		const minutes = num(fd, `jar_${i}_minutes`);
		const psi = method === 'pressure' ? num(fd, `jar_${i}_psi`) : null;
		if (!size && minutes === null && psi === null) continue;
		jars.push({ size, minutes, psi });
	}
	return { method, headspaceIn: num(fd, 'headspaceIn'), jars };
}

/** Reads the task_<n>_<field> rows; rows without a name are skipped. */
function readTaskTemplates(fd: FormData, phases: readonly string[]): TaskTemplate[] {
	const count = Math.min(num(fd, 'taskCount') ?? 0, MAX_TASK_ROWS);
	const tasks: TaskTemplate[] = [];
	for (let i = 0; i < count; i++) {
		const title = str(fd, `task_${i}_title`);
		if (!title) continue;
		const picked = recurrenceFromPicker(str(fd, `task_${i}_repeat`), num(fd, `task_${i}_every`));
		const days = recurrenceDays(picked);
		// An unreadable repeat is kept as typed so the protocol check can explain it.
		const recurrence = picked && days !== null ? recurrenceFor(days) : picked;
		// A phase outside the list is kept as posted so the protocol check can explain it.
		const phase = phases.length ? str(fd, `task_${i}_phase`) : null;
		const t: TaskTemplate = {
			title,
			startDay: num(fd, `task_${i}_start`) ?? 0,
			recurrence,
			// A phase task stops when the batch leaves the phase, so it has no last day.
			endDay: recurrence && !phase ? num(fd, `task_${i}_end`) : null
		};
		if (phase) t.phase = phase;
		tasks.push(t);
	}
	return tasks;
}
