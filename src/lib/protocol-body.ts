// Shape of protocol.body_json. Kept loose on purpose: later batch types add
// fields, and old protocols without them must still load.

import { formatRecurrence } from './recurrence';
import type { PreserveMethod } from './enums';

export type TargetRange = {
	kind: string;
	min: number | null;
	max: number | null;
	unit: string;
	/**
	 * Added in Phase 3 (D25). A target for one phase wins over one with no
	 * phase, which applies to every phase. Targets saved before have none.
	 */
	phase?: string | null;
};

/**
 * A task the protocol adds to every batch started from it (D19). Days count
 * from Day 0, so "day 1, weekly, until day 28" means the day after the start,
 * then every week through day 28.
 *
 * A phase task (D26, Phase 3) is created when the batch enters that phase
 * instead; its startDay counts from that day and it has no endDay, because it
 * stops when the batch leaves the phase.
 */
export type TaskTemplate = {
	title: string;
	startDay: number;
	recurrence: string | null;
	endDay: number | null;
	phase?: string | null;
};

/** Processing time for one jar size (D28), already adjusted for altitude by whoever typed it. */
export type JarTime = {
	size: string;
	minutes: number | null;
	/** Pressure canning only. */
	psi: number | null;
};

/** How a preserve is processed (D28). Added in Phase 4; other bodies have none. */
export type Processing = {
	method: PreserveMethod | null;
	headspaceIn: number | null;
	jars: JarTime[];
};

export type ProtocolBody = {
	ingredients: string[];
	steps: string[];
	targets: TargetRange[];
	expectedDays: number | null;
	servings?: string | null;
	sourceUrl?: string | null;
	/** Paprika's own id for the recipe, so a second import of the same file skips it. */
	paprikaUid?: string | null;
	/** Added in Phase 2. Protocols and snapshots saved before then have none. */
	tasks?: TaskTemplate[];
	/** Added in Phase 4 for preserves (D28, D30). */
	processing?: Processing;
	shelfLifeMonths?: number | null;
};

/** Frozen copy of a protocol stored on a batch at creation (CLAUDE.md rule 4). */
export type ProtocolSnapshot = {
	protocolId: string;
	familyId: string;
	name: string;
	version: number;
	source: string | null;
	notes: string | null;
	body: ProtocolBody;
	snapshotAt: string;
};

/** The task list of a body, empty for bodies saved before task lists existed. */
export function bodyTasks(body: ProtocolBody | null | undefined): TaskTemplate[] {
	return body?.tasks ?? [];
}

/** The processing details of a body, or undefined for bodies without any. */
export function bodyProcessing(body: ProtocolBody | null | undefined): Processing | undefined {
	const p = body?.processing;
	if (!p) return undefined;
	return { method: p.method ?? null, headspaceIn: p.headspaceIn ?? null, jars: p.jars ?? [] };
}

const FRACTIONS: Record<string, string> = {
	'0.125': '1/8',
	'0.25': '1/4',
	'0.375': '3/8',
	'0.5': '1/2',
	'0.625': '5/8',
	'0.75': '3/4',
	'0.875': '7/8'
};

/** 0.5 reads as "1/2 in", 1.25 as "1 1/4 in", 0.3 as "0.3 in". */
export function formatHeadspace(inches: number | null | undefined): string {
	if (inches == null) return '';
	const whole = Math.trunc(inches);
	const frac = FRACTIONS[String(Math.round((inches - whole) * 1000) / 1000)];
	if (frac) return `${whole ? `${whole} ` : ''}${frac} in`;
	return `${inches} in`;
}

/** The task a new preserve protocol starts with (D33); it can be edited or removed. */
export const SEAL_CHECK_TASK: TaskTemplate = {
	title: 'Check seals, remove rings, label',
	startDay: 1,
	recurrence: null,
	endDay: null
};

export function emptyBody(): ProtocolBody {
	return { ingredients: [], steps: [], targets: [], expectedDays: null };
}

/** The target that applies to a reading kind in a phase: the phase's own first, then the all-phases one. */
export function targetFor(
	targets: TargetRange[],
	kind: string,
	phase: string | null | undefined
): TargetRange | undefined {
	return (
		(phase ? targets.find((t) => t.kind === kind && t.phase === phase) : undefined) ??
		targets.find((t) => t.kind === kind && !t.phase)
	);
}

/** "3.4 to 4.6 pH", "up to 4.6 pH", or "at least 68 °F". */
export function formatRange(t: TargetRange): string {
	if (t.min !== null && t.max !== null) return `${t.min} to ${t.max} ${t.unit}`;
	if (t.max !== null) return `up to ${t.max} ${t.unit}`;
	return `at least ${t.min} ${t.unit}`;
}

/** "Day 1, every week through day 28", "Day 3", or "During fruiting, every day". */
export function formatTemplate(t: TaskTemplate): string {
	const repeat = formatRecurrence(t.recurrence);
	if (t.phase) {
		const start =
			t.startDay > 0 ? `${t.startDay} day${t.startDay === 1 ? '' : 's'} into ${t.phase}` : '';
		const when = start || `When ${t.phase} starts`;
		if (!repeat) return when;
		return start
			? `From ${start}, ${repeat.toLowerCase()}`
			: `During ${t.phase}, ${repeat.toLowerCase()}`;
	}
	if (!repeat) return `Day ${t.startDay}`;
	const end = t.endDay !== null ? ` through day ${t.endDay}` : '';
	return `Day ${t.startDay}, ${repeat.toLowerCase()}${end}`;
}
