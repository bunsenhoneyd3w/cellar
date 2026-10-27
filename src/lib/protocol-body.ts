// Shape of protocol.body_json. Kept loose on purpose: later batch types add
// fields, and old protocols without them must still load.

import { formatRecurrence } from './recurrence';

export type TargetRange = {
	kind: string;
	min: number | null;
	max: number | null;
	unit: string;
};

/**
 * A task the protocol adds to every batch started from it (D19). Days count
 * from Day 0, so "day 1, weekly, until day 28" means the day after the start,
 * then every week through day 28.
 */
export type TaskTemplate = {
	title: string;
	startDay: number;
	recurrence: string | null;
	endDay: number | null;
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

export function emptyBody(): ProtocolBody {
	return { ingredients: [], steps: [], targets: [], expectedDays: null };
}

/** "3.4 to 4.6 pH", "up to 4.6 pH", or "at least 68 °F". */
export function formatRange(t: TargetRange): string {
	if (t.min !== null && t.max !== null) return `${t.min} to ${t.max} ${t.unit}`;
	if (t.max !== null) return `up to ${t.max} ${t.unit}`;
	return `at least ${t.min} ${t.unit}`;
}

/** "Day 1, every week through day 28" or "Day 3". */
export function formatTemplate(t: TaskTemplate): string {
	const repeat = formatRecurrence(t.recurrence);
	if (!repeat) return `Day ${t.startDay}`;
	const end = t.endDay !== null ? ` through day ${t.endDay}` : '';
	return `Day ${t.startDay}, ${repeat.toLowerCase()}${end}`;
}
