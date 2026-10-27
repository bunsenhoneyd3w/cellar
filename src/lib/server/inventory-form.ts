import { INVENTORY_STATUSES } from '../enums';
import { num, oneOf, str } from './form';
import type { ItemInput } from './inventory';
import type { ShelfRow } from './outcomes';

/** Reads the shelf item form. A blank count keeps the status picked by hand (D31). */
export function readItemForm(fd: FormData): ItemInput {
	return {
		name: str(fd, 'name') ?? '',
		quantity: num(fd, 'quantity'),
		unit: str(fd, 'unit'),
		spaceId: str(fd, 'spaceId'),
		packedAt: str(fd, 'packedAt'),
		useBy: str(fd, 'useBy'),
		batchId: str(fd, 'batchId'),
		status: oneOf(fd, 'status', INVENTORY_STATUSES)
	};
}

const MAX_SHELF_ROWS = 20;

/** Reads the shelf_<n>_<field> rows of the finish screen; rows without a count are skipped. */
export function readShelfRows(fd: FormData): ShelfRow[] {
	const count = Math.min(num(fd, 'shelfCount') ?? 0, MAX_SHELF_ROWS);
	const rows: ShelfRow[] = [];
	for (let i = 0; i < count; i++) {
		const quantity = num(fd, `shelf_${i}_quantity`);
		if (quantity === null) continue;
		rows.push({
			name: str(fd, `shelf_${i}_name`) ?? '',
			quantity,
			unit: str(fd, `shelf_${i}_unit`),
			spaceId: str(fd, `shelf_${i}_spaceId`),
			useBy: str(fd, `shelf_${i}_useBy`)
		});
	}
	return rows;
}
