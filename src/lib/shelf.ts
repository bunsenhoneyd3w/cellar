import type { InventoryStatus, SpaceKind } from './enums';
import { addMonths, isDate, localDate } from './time';

// Shelf rules shared by the data layer and the screens (D30, D31).

/** At or below this many left, an item shows as low (D31). */
export const LOW_AT = 2;

/** "Soon" on the use-by view: within this many months of the use-by date (D30). */
export const SOON_MONTHS = 2;

/** Gone at 0, low at 2 or fewer, in stock above (D31). */
export function statusFor(quantity: number): InventoryStatus {
	if (quantity <= 0) return 'gone';
	if (quantity <= LOW_AT) return 'low';
	return 'in_stock';
}

/** The use-by a protocol's shelf life gives a packed date (D30), or null without one. */
export function defaultUseBy(
	packedAt: string | null | undefined,
	shelfLifeMonths: number | null | undefined
): string | null {
	if (!isDate(packedAt) || !shelfLifeMonths) return null;
	return addMonths(packedAt, shelfLifeMonths);
}

export type UseByState = 'past' | 'soon' | 'ok';

/** Past its use-by, within 2 months of it, or fine; null when there is no use-by. */
export function useByState(
	useBy: string | null | undefined,
	today: string = localDate()
): UseByState | null {
	if (!useBy) return null;
	if (useBy < today) return 'past';
	if (useBy <= addMonths(today, SOON_MONTHS)) return 'soon';
	return 'ok';
}

/** Shelves and appliances (fridge, freezer) first in the shelf picker, then everything else. */
export function shelvesFirst<T extends { kind: SpaceKind }>(spaces: T[]): T[] {
	const rank = (k: SpaceKind) => (k === 'shelf' || k === 'appliance' ? 0 : 1);
	return [...spaces].sort((a, b) => rank(a.kind) - rank(b.kind));
}

/** "7 jars", "0.5 lb", or "" when there is no count. */
export function formatCount(quantity: number | null, unit: string | null): string {
	if (quantity === null) return '';
	return `${Math.round(quantity * 100) / 100}${unit ? ` ${unit}` : ''}`;
}

/**
 * A form action URL that keeps the page's own query, e.g. "?/use&view=use-by",
 * so a tap on the use-by view stays on the use-by view.
 */
export function actionWithQuery(name: string, search: string): string {
	const q = search.replace(/^\?/, '');
	return `?/${name}${q ? `&${q}` : ''}`;
}
