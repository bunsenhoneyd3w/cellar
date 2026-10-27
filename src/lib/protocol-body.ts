// Shape of protocol.body_json. Kept loose on purpose: later batch types add
// fields, and old protocols without them must still load.

export type TargetRange = {
	kind: string;
	min: number | null;
	max: number | null;
	unit: string;
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

export function emptyBody(): ProtocolBody {
	return { ingredients: [], steps: [], targets: [], expectedDays: null };
}

/** "3.4 to 4.6 pH", "up to 4.6 pH", or "at least 68 °F". */
export function formatRange(t: TargetRange): string {
	if (t.min !== null && t.max !== null) return `${t.min} to ${t.max} ${t.unit}`;
	if (t.max !== null) return `up to ${t.max} ${t.unit}`;
	return `at least ${t.min} ${t.unit}`;
}
