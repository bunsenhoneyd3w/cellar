import type { BatchType } from './enums';

// Reading kinds (D14, mushrooms D24). Every reading row stores its own unit; the unit here is
// what the capture screen offers, not an assumption made when reading data back.

export type ReadingKind = {
	kind: string;
	label: string;
	unit: string;
	usedBy: BatchType[];
	/** Step for the number keypad input. */
	step: string;
	/** A different name on some batch types, e.g. substrate temp on a grow. */
	labels?: Partial<Record<BatchType, string>>;
	/**
	 * Logged only in the harvest part of a check-in (D23). Left out of the
	 * readings list, the protocol targets, and the line charts.
	 */
	harvest?: boolean;
};

export const READING_KINDS: ReadingKind[] = [
	{
		kind: 'temp_air',
		label: 'Air temp',
		unit: '°F',
		usedBy: ['ferment', 'mushroom', 'hydroponic', 'seedling', 'preserve'],
		step: '0.1'
	},
	{
		kind: 'temp_substrate',
		label: 'Brine or mash temp',
		unit: '°F',
		usedBy: ['ferment', 'mushroom'],
		step: '0.1',
		labels: { mushroom: 'Substrate temp' }
	},
	{ kind: 'ph', label: 'pH', unit: 'pH', usedBy: ['ferment', 'hydroponic'], step: '0.01' },
	{ kind: 'brix', label: 'Brix', unit: '°Bx', usedBy: ['ferment'], step: '0.1' },
	{
		kind: 'specific_gravity',
		label: 'Specific gravity',
		unit: 'SG',
		usedBy: ['ferment'],
		step: '0.001'
	},
	{ kind: 'salinity', label: 'Salinity', unit: '%', usedBy: ['ferment'], step: '0.1' },
	{
		kind: 'weight',
		label: 'Weight',
		unit: 'g',
		usedBy: ['ferment', 'mushroom'],
		step: '1',
		labels: { mushroom: 'Block weight' }
	},
	{ kind: 'rh', label: 'Humidity', unit: '%', usedBy: ['mushroom', 'seedling'], step: '1' },
	{ kind: 'ec', label: 'EC', unit: 'mS/cm', usedBy: ['hydroponic'], step: '0.01' },
	{ kind: 'water_level', label: 'Water level', unit: 'in', usedBy: ['hydroponic'], step: '0.1' },
	{ kind: 'height', label: 'Height', unit: 'in', usedBy: ['hydroponic', 'seedling'], step: '0.1' },
	{
		kind: 'light_hours',
		label: 'Light hours',
		unit: 'h',
		usedBy: ['mushroom', 'seedling', 'hydroponic'],
		step: '0.5'
	},
	{ kind: 'co2', label: 'CO2', unit: 'ppm', usedBy: ['mushroom'], step: '1' },
	{
		kind: 'harvest_weight',
		label: 'Harvest weight',
		unit: 'g',
		usedBy: ['mushroom'],
		step: '1',
		harvest: true
	}
];

export const HARVEST_KIND = 'harvest_weight';

export function readingKind(kind: string): ReadingKind | undefined {
	return READING_KINDS.find((k) => k.kind === kind);
}

/** The kinds a batch type uses, each carrying the label that type shows. */
export function kindsFor(type: BatchType): ReadingKind[] {
	return READING_KINDS.filter((k) => k.usedBy.includes(type)).map((k) => ({
		...k,
		label: k.labels?.[type] ?? k.label
	}));
}

/** Kinds that take a target range and a line chart: everything but harvests. */
export function trackedKindsFor(type: BatchType): ReadingKind[] {
	return kindsFor(type).filter((k) => !k.harvest);
}

/** The name of a reading kind on a batch type, or the raw kind if it is not in the list. */
export function kindLabel(kind: string, type?: BatchType): string {
	const k = readingKind(kind);
	if (!k) return kind;
	return (type && k.labels?.[type]) || k.label;
}
