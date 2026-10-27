import { asc, eq } from 'drizzle-orm';
import type { Db } from './db';
import { equipment, space } from './db/schema';
import type { EquipmentKind } from '../enums';
import { InputError } from './form';

export type Equipment = typeof equipment.$inferSelect;
export type EquipmentInput = {
	name: string;
	kind: EquipmentKind;
	model?: string | null;
	specsJson?: Record<string, unknown> | null;
	spaceId?: string | null;
	notes?: string | null;
};

export function listEquipment(db: Db) {
	return db
		.select({ item: equipment, spaceName: space.name })
		.from(equipment)
		.leftJoin(space, eq(equipment.spaceId, space.id))
		.orderBy(asc(equipment.name))
		.all()
		.map((r) => ({ ...r.item, spaceName: r.spaceName }));
}

export function getEquipment(db: Db, id: string): Equipment | undefined {
	return db.select().from(equipment).where(eq(equipment.id, id)).get();
}

export function createEquipment(db: Db, input: EquipmentInput): Equipment {
	if (!input.name.trim()) throw new InputError('Give the equipment a name.');
	return db
		.insert(equipment)
		.values({ ...input, spaceId: input.spaceId || null })
		.returning()
		.get();
}

export function updateEquipment(db: Db, id: string, input: EquipmentInput): Equipment {
	if (!input.name.trim()) throw new InputError('Give the equipment a name.');
	const row = db
		.update(equipment)
		.set({ ...input, spaceId: input.spaceId || null })
		.where(eq(equipment.id, id))
		.returning()
		.get();
	if (!row) throw new InputError('That equipment no longer exists.');
	return row;
}

/**
 * Specs are typed as one "name: value" per line, e.g. "capacity: 1 gal".
 * Plain numbers are stored as numbers so they can be compared later.
 */
export function parseSpecs(text: string | null): Record<string, unknown> | null {
	const out: Record<string, unknown> = {};
	for (const raw of (text ?? '').split(/\r?\n/)) {
		const line = raw.trim();
		if (!line) continue;
		const i = line.indexOf(':');
		const key = (i === -1 ? line : line.slice(0, i)).trim();
		const value = i === -1 ? '' : line.slice(i + 1).trim();
		if (!key) continue;
		out[key] = value !== '' && Number.isFinite(Number(value)) ? Number(value) : value;
	}
	return Object.keys(out).length ? out : null;
}

export function formatSpecs(specs: Record<string, unknown> | null | undefined): string {
	if (!specs) return '';
	return Object.entries(specs)
		.map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
		.join('\n');
}
