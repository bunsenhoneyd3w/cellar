import { and, asc, eq, ne } from 'drizzle-orm';
import type { Db } from './db';
import { batch, inventoryItem } from './db/schema';
import type { InventoryStatus } from '../enums';
import { isDate, localDate } from '../time';
import { statusFor, useByState, type UseByState } from '../shelf';
import { InputError } from './form';
import { listSpaces } from './spaces';

export { defaultUseBy, statusFor, useByState, type UseByState } from '../shelf';

export type InventoryItem = typeof inventoryItem.$inferSelect;

/**
 * `packedAt` and `useBy` are local dates such as 2026-10-27, like task due
 * dates (D18). `status` is only used when there is no quantity; with a
 * quantity, the status follows it (D31).
 */
export type ItemInput = {
	name: string;
	quantity?: number | null;
	unit?: string | null;
	spaceId?: string | null;
	packedAt?: string | null;
	useBy?: string | null;
	batchId?: string | null;
	status?: InventoryStatus | null;
};

function values(db: Db, input: ItemInput) {
	const name = input.name.trim();
	if (!name) throw new InputError('Give the item a name.');
	const quantity = input.quantity ?? null;
	if (quantity !== null && !(quantity >= 0)) throw new InputError('The count cannot be negative.');
	for (const [key, text] of [
		['packedAt', 'packed date'],
		['useBy', 'use-by date']
	] as const) {
		const d = input[key];
		if (d && !isDate(d)) throw new InputError(`The ${text} is not a real date.`);
	}
	if (input.packedAt && input.useBy && input.useBy < input.packedAt) {
		throw new InputError('The use-by date is before the packed date.');
	}
	if (input.batchId && !db.select().from(batch).where(eq(batch.id, input.batchId)).get()) {
		throw new InputError('That batch no longer exists.');
	}
	return {
		name,
		quantity,
		unit: input.unit?.trim() || null,
		spaceId: input.spaceId || null,
		packedAt: input.packedAt || null,
		useBy: input.useBy || null,
		batchId: input.batchId || null,
		status: quantity !== null ? statusFor(quantity) : (input.status ?? 'in_stock')
	};
}

export function createItem(db: Db, input: ItemInput): InventoryItem {
	return db.insert(inventoryItem).values(values(db, input)).returning().get();
}

/** Several items at once, all or none, e.g. pints and quarts from one canning day. */
export function createItems(db: Db, inputs: ItemInput[]): InventoryItem[] {
	return db.transaction((tx) => inputs.map((input) => createItem(tx, input)));
}

export function updateItem(db: Db, id: string, input: ItemInput): InventoryItem {
	if (!getItem(db, id)) throw new InputError('That item no longer exists.');
	return db
		.update(inventoryItem)
		.set(values(db, input))
		.where(eq(inventoryItem.id, id))
		.returning()
		.get();
}

export function getItem(db: Db, id: string): InventoryItem | undefined {
	return db.select().from(inventoryItem).where(eq(inventoryItem.id, id)).get();
}

export function deleteItem(db: Db, id: string) {
	db.delete(inventoryItem).where(eq(inventoryItem.id, id)).run();
}

function setQuantity(db: Db, id: string, quantity: number): InventoryItem {
	return db
		.update(inventoryItem)
		.set({ quantity, status: statusFor(quantity) })
		.where(eq(inventoryItem.id, id))
		.returning()
		.get();
}

/**
 * "Used one" (D31): one fewer, never below 0. Returns the count before, so
 * Undo can put back exactly what was there (a half pound stays a half pound).
 */
export function useOne(db: Db, id: string): { item: InventoryItem; before: number } {
	const item = getItem(db, id);
	if (!item) throw new InputError('That item no longer exists.');
	if (item.quantity === null) throw new InputError(`${item.name} has no count to lower.`);
	if (item.quantity <= 0) throw new InputError(`${item.name} is already gone.`);
	return { item: setQuantity(db, id, Math.max(0, item.quantity - 1)), before: item.quantity };
}

/** Undo for "Used one": puts the count back to what it was before. */
export function undoUse(db: Db, id: string, before: number): InventoryItem {
	if (!getItem(db, id)) throw new InputError('That item no longer exists.');
	if (!(before >= 0)) throw new InputError('Nothing to undo.');
	return setQuantity(db, id, before);
}

export type ShelfItem = InventoryItem & {
	spacePath: string | null;
	batchName: string | null;
};

export type InventoryFilter = { includeGone?: boolean; spaceId?: string; batchId?: string };

/** Items with where they are and what made them, by name. Gone items only when asked. */
export function listInventory(db: Db, filter: InventoryFilter = {}): ShelfItem[] {
	const paths = new Map(listSpaces(db).map((s) => [s.id, s.path]));
	return db
		.select({ item: inventoryItem, batchName: batch.name })
		.from(inventoryItem)
		.leftJoin(batch, eq(inventoryItem.batchId, batch.id))
		.where(
			and(
				filter.includeGone ? undefined : ne(inventoryItem.status, 'gone'),
				filter.spaceId ? eq(inventoryItem.spaceId, filter.spaceId) : undefined,
				filter.batchId ? eq(inventoryItem.batchId, filter.batchId) : undefined
			)
		)
		.orderBy(asc(inventoryItem.name), asc(inventoryItem.packedAt))
		.all()
		.map((r) => ({
			...r.item,
			spacePath: r.item.spaceId ? (paths.get(r.item.spaceId) ?? null) : null,
			batchName: r.batchName
		}));
}

/** Every item a batch put on the shelf, gone ones included. */
export function itemsForBatch(db: Db, batchId: string): ShelfItem[] {
	return listInventory(db, { batchId, includeGone: true });
}

/** Items on hand that are past their use-by or coming up on it, for Today. */
export function shelfSummary(db: Db, today: string = localDate()) {
	const items = listInventory(db);
	const sorted = (state: UseByState) =>
		items
			.filter((i) => useByState(i.useBy, today) === state)
			.sort((a, b) => (a.useBy ?? '').localeCompare(b.useBy ?? ''));
	return { past: sorted('past'), soon: sorted('soon') };
}
