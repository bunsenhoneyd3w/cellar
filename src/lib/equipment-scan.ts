import { EQUIPMENT_KINDS, type EquipmentKind } from './enums';

// Adding equipment from a photo (D42 to D44). Claude answers in SCAN_SCHEMA;
// normalizeScan cleans that answer, the review screen lets Seth fix it, and
// specsFromItem turns a reviewed item into the equipment's specs.

export const SIZE_NAMES = ['capacity', 'height', 'width', 'depth', 'diameter', 'wattage'] as const;
export type SizeName = (typeof SIZE_NAMES)[number];

export const SIZE_UNITS = [
	'gal',
	'qt',
	'pt',
	'cup',
	'fl_oz',
	'L',
	'mL',
	'in',
	'ft',
	'cm',
	'mm',
	'W'
] as const;
export type SizeUnit = (typeof SIZE_UNITS)[number];

/** Where a size came from. Claude gives the first three; `entered` means Seth typed it. */
export const SIZE_SOURCES = ['label', 'known', 'estimate', 'entered'] as const;
export type SizeSource = (typeof SIZE_SOURCES)[number];

export const SIZE_SOURCE_LABELS: Record<SizeSource, string> = {
	label: 'From the label',
	known: 'Known for this model',
	estimate: 'Estimate',
	entered: 'Typed by you'
};

export const unitLabel = (u: string) => (u === 'fl_oz' ? 'fl oz' : u);

export type ScanSize = { name: SizeName; value: number; unit: SizeUnit; source: SizeSource };
export type ScanItem = {
	name: string;
	brand: string;
	model: string;
	kind: EquipmentKind;
	count: number;
	where: string;
	sizes: ScanSize[];
};

/** The JSON shape Claude must answer in. Unknown text is an empty string, never null. */
export const SCAN_SCHEMA = {
	type: 'object',
	properties: {
		items: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					name: { type: 'string' },
					brand: { type: 'string' },
					model: { type: 'string' },
					kind: { type: 'string', enum: [...EQUIPMENT_KINDS] },
					count: { type: 'integer' },
					where: { type: 'string' },
					sizes: {
						type: 'array',
						items: {
							type: 'object',
							properties: {
								name: { type: 'string', enum: [...SIZE_NAMES] },
								value: { type: 'number' },
								unit: { type: 'string', enum: [...SIZE_UNITS] },
								source: { type: 'string', enum: ['label', 'known', 'estimate'] }
							},
							required: ['name', 'value', 'unit', 'source'],
							additionalProperties: false
						}
					}
				},
				required: ['name', 'brand', 'model', 'kind', 'count', 'where', 'sizes'],
				additionalProperties: false
			}
		}
	},
	required: ['items'],
	additionalProperties: false
} as const;

const text = (v: unknown, max = 120) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const oneOf = <T extends string>(v: unknown, list: readonly T[]): T | undefined =>
	list.find((x) => x === v);

/** Keeps only well-formed items and sizes from whatever came back. */
export function normalizeScan(raw: unknown): ScanItem[] {
	const list = (raw as { items?: unknown } | null)?.items;
	if (!Array.isArray(list)) return [];
	const out: ScanItem[] = [];
	for (const r of list as Record<string, unknown>[]) {
		if (!r || typeof r !== 'object') continue;
		const name = text(r.name);
		if (!name) continue;
		const count = Number(r.count);
		const sizes: ScanSize[] = [];
		for (const s of Array.isArray(r.sizes) ? (r.sizes as Record<string, unknown>[]) : []) {
			const sizeName = oneOf(s?.name, SIZE_NAMES);
			const unit = oneOf(s?.unit, SIZE_UNITS);
			const source = oneOf(s?.source, ['label', 'known', 'estimate'] as const);
			const value = Number(s?.value);
			if (!sizeName || !unit || !source || !Number.isFinite(value) || value <= 0) continue;
			// One value per size and unit; the first one wins.
			if (sizes.some((x) => x.name === sizeName && x.unit === unit)) continue;
			sizes.push({ name: sizeName, value, unit, source });
		}
		out.push({
			name,
			brand: text(r.brand, 60),
			model: text(r.model, 60),
			kind: oneOf(r.kind, EQUIPMENT_KINDS) ?? 'other',
			count: Number.isFinite(count) && count >= 1 ? Math.min(Math.round(count), 999) : 1,
			where: text(r.where, 60),
			sizes
		});
	}
	return out;
}

/** A size on the review screen: what Claude said, plus whether Seth confirmed an estimate. */
export type ReviewSize = ScanSize & { original: number | null; confirmed: boolean };
export type ReviewItem = Omit<ScanItem, 'sizes'> & { keep: boolean; sizes: ReviewSize[] };

export function toReview(items: ScanItem[]): ReviewItem[] {
	return items.map((it) => ({
		...it,
		keep: true,
		sizes: it.sizes.map((s) => ({ ...s, original: s.value, confirmed: false }))
	}));
}

export function blankReviewItem(): ReviewItem {
	return {
		name: '',
		brand: '',
		model: '',
		kind: 'other',
		count: 1,
		where: '',
		keep: true,
		sizes: []
	};
}

/** A changed value is Seth's own, whatever Claude first said about it. */
export function sizeSource(s: ReviewSize): SizeSource {
	return s.original !== null && s.value !== s.original ? 'entered' : s.source;
}

export function needsConfirming(s: ReviewSize): boolean {
	return sizeSource(s) === 'estimate' && !s.confirmed;
}

/** An error for ticked items that still hold unconfirmed estimates (D44), or null. */
export function checkEstimates(items: ReviewItem[]): string | null {
	const open = items.filter((it) => it.keep && it.sizes.some(needsConfirming));
	if (!open.length) return null;
	return `Confirm or fix the estimated sizes on: ${open.map((it) => it.name || 'unnamed item').join(', ')}.`;
}

/** Specs in the same "name_unit: value" style the specs box uses, each size with its source. */
export function specsFromItem(item: ReviewItem): Record<string, unknown> | null {
	const specs: Record<string, unknown> = {};
	if (item.brand) specs.brand = item.brand;
	if (item.count > 1) specs.count = item.count;
	for (const s of item.sizes) {
		const key = `${s.name}_${s.unit}`;
		specs[key] = s.value;
		specs[`${key}_source`] = sizeSource(s);
	}
	return Object.keys(specs).length ? specs : null;
}
