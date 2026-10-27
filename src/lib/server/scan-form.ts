import { EQUIPMENT_KINDS } from '../enums';
import {
	SIZE_NAMES,
	SIZE_SOURCES,
	SIZE_UNITS,
	type ReviewItem,
	type ReviewSize
} from '../equipment-scan';
import { num, oneOf, str } from './form';

export type ScanPhoto = { path: string; originalPath: string | null };
export type ScanReview = { photo: ScanPhoto; spaceId: string | null; items: ReviewItem[] };

// Field names on the review screen: item i is `i_name`, `i_keep`, and so on;
// size j of item i is `i_s_j_value` with its name, unit, source, original
// value, and `i_s_j_ok` when an estimate was confirmed.

/** Reads the review screen back into items, keeping every edit so the screen can be shown again. */
export function readScanForm(fd: FormData): ScanReview {
	const items: ReviewItem[] = [];
	const count = Math.min(num(fd, 'itemCount') ?? 0, 50);
	for (let i = 0; i < count; i++) {
		const sizes: ReviewSize[] = [];
		const sizeCount = Math.min(num(fd, `${i}_sizeCount`) ?? 0, 20);
		for (let j = 0; j < sizeCount; j++) {
			const p = `${i}_s_${j}_`;
			const value = num(fd, `${p}value`);
			const name = oneOf(fd, `${p}name`, SIZE_NAMES);
			const unit = oneOf(fd, `${p}unit`, SIZE_UNITS);
			// A cleared value removes the size.
			if (value === null || value <= 0 || !name || !unit) continue;
			sizes.push({
				name,
				unit,
				value,
				source: oneOf(fd, `${p}source`, SIZE_SOURCES) ?? 'entered',
				original: num(fd, `${p}original`),
				confirmed: fd.has(`${p}ok`)
			});
		}
		const n = num(fd, `${i}_count`);
		items.push({
			keep: fd.has(`${i}_keep`),
			name: str(fd, `${i}_name`) ?? '',
			brand: str(fd, `${i}_brand`) ?? '',
			model: str(fd, `${i}_model`) ?? '',
			kind: oneOf(fd, `${i}_kind`, EQUIPMENT_KINDS) ?? 'other',
			count: n !== null && n >= 1 ? Math.round(n) : 1,
			where: str(fd, `${i}_where`) ?? '',
			sizes
		});
	}
	return {
		photo: { path: str(fd, 'photoPath') ?? '', originalPath: str(fd, 'photoOriginalPath') },
		spaceId: str(fd, 'spaceId'),
		items
	};
}
