import { INVENTORY_STATUSES } from '../enums';
import { num, oneOf, str } from './form';
import type { ItemInput } from './inventory';

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
