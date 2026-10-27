import { asc, eq, sql } from 'drizzle-orm';
import type { Db } from './db';
import { equipment, equipmentPhoto, space } from './db/schema';
import type { EquipmentKind } from '../enums';
import { InputError } from './form';
import { deletePhotoFiles } from './photos';

export type Equipment = typeof equipment.$inferSelect;
export type EquipmentPhoto = typeof equipmentPhoto.$inferSelect;
export type EquipmentInput = {
	name: string;
	kind: EquipmentKind;
	model?: string | null;
	specsJson?: Record<string, unknown> | null;
	spaceId?: string | null;
	notes?: string | null;
};

export function listEquipment(db: Db) {
	// The oldest photo stands for the item in the list.
	const thumb = sql<string | null>`(
		select ${equipmentPhoto.path} from ${equipmentPhoto}
		where ${equipmentPhoto.equipmentId} = ${equipment.id}
		order by ${equipmentPhoto.createdAt}, ${equipmentPhoto.id} limit 1
	)`;
	return db
		.select({ item: equipment, spaceName: space.name, thumb })
		.from(equipment)
		.leftJoin(space, eq(equipment.spaceId, space.id))
		.orderBy(asc(equipment.name))
		.all()
		.map((r) => ({ ...r.item, spaceName: r.spaceName, thumb: r.thumb }));
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

export function listEquipmentPhotos(db: Db, equipmentId: string): EquipmentPhoto[] {
	return db
		.select()
		.from(equipmentPhoto)
		.where(eq(equipmentPhoto.equipmentId, equipmentId))
		.orderBy(asc(equipmentPhoto.createdAt), asc(equipmentPhoto.id))
		.all();
}

export function addEquipmentPhoto(
	db: Db,
	equipmentId: string,
	saved: { path: string; originalPath: string | null },
	takenAt: string | null = null
): EquipmentPhoto {
	if (!getEquipment(db, equipmentId)) throw new InputError('That equipment no longer exists.');
	return db
		.insert(equipmentPhoto)
		.values({ equipmentId, path: saved.path, originalPath: saved.originalPath, takenAt })
		.returning()
		.get();
}

/**
 * Removes one photo from one item. The files go only when no other item still
 * shows the same picture (a shelf photo sits on every item it added).
 */
export function deleteEquipmentPhoto(
	db: Db,
	id: string,
	root?: string
): EquipmentPhoto | undefined {
	const row = db.delete(equipmentPhoto).where(eq(equipmentPhoto.id, id)).returning().get();
	if (!row) return undefined;
	const stillUsed = db
		.select({ id: equipmentPhoto.id })
		.from(equipmentPhoto)
		.where(eq(equipmentPhoto.path, row.path))
		.get();
	if (!stillUsed) deletePhotoFiles([row.path, row.originalPath], root);
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
