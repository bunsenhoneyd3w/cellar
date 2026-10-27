import { asc, eq } from 'drizzle-orm';
import type { Db } from './db';
import { space } from './db/schema';
import type { SpaceKind } from '../enums';
import { InputError } from './form';

export type Space = typeof space.$inferSelect;
export type SpaceInput = {
	name: string;
	kind: SpaceKind;
	parentSpaceId?: string | null;
	notes?: string | null;
};

/** A space with its nesting depth and full path, e.g. "Basement lab / Shelf B". */
export type SpaceNode = Space & { depth: number; path: string };

export function listSpaces(db: Db): SpaceNode[] {
	const rows = db.select().from(space).orderBy(asc(space.name)).all();
	const byParent = new Map<string | null, Space[]>();
	for (const r of rows) {
		const key =
			r.parentSpaceId && rows.some((p) => p.id === r.parentSpaceId) ? r.parentSpaceId : null;
		byParent.set(key, [...(byParent.get(key) ?? []), r]);
	}
	const out: SpaceNode[] = [];
	const walk = (parent: string | null, depth: number, prefix: string) => {
		for (const s of byParent.get(parent) ?? []) {
			const p = prefix ? `${prefix} / ${s.name}` : s.name;
			out.push({ ...s, depth, path: p });
			walk(s.id, depth + 1, p);
		}
	};
	walk(null, 0, '');
	return out;
}

export function getSpace(db: Db, id: string): Space | undefined {
	return db.select().from(space).where(eq(space.id, id)).get();
}

export function createSpace(db: Db, input: SpaceInput): Space {
	check(db, null, input);
	return db
		.insert(space)
		.values({ ...input, parentSpaceId: input.parentSpaceId || null })
		.returning()
		.get();
}

export function updateSpace(db: Db, id: string, input: SpaceInput): Space {
	check(db, id, input);
	const row = db
		.update(space)
		.set({ ...input, parentSpaceId: input.parentSpaceId || null })
		.where(eq(space.id, id))
		.returning()
		.get();
	if (!row) throw new InputError('That space no longer exists.');
	return row;
}

function check(db: Db, id: string | null, input: SpaceInput) {
	if (!input.name.trim()) throw new InputError('Give the space a name.');
	if (!input.parentSpaceId) return;
	// Walk up from the chosen parent; meeting this space means a loop.
	let cursor: string | null = input.parentSpaceId;
	while (cursor) {
		if (cursor === id) throw new InputError('A space cannot sit inside itself.');
		const parent = getSpace(db, cursor);
		if (!parent) throw new InputError('The chosen parent space does not exist.');
		cursor = parent.parentSpaceId;
	}
}

/** A space and every space inside it, at any depth: what "in the basement" means for a filter. */
export function spaceAndInside(
	spaces: Pick<Space, 'id' | 'parentSpaceId'>[],
	id: string
): string[] {
	const out = [id];
	for (let i = 0; i < out.length; i++) {
		for (const s of spaces) if (s.parentSpaceId === out[i] && !out.includes(s.id)) out.push(s.id);
	}
	return out;
}
