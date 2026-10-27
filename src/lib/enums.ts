// Fixed lists shared by the database schema and the screens.

export const BATCH_TYPES = ['ferment', 'mushroom', 'hydroponic', 'seedling', 'preserve'] as const;
export type BatchType = (typeof BATCH_TYPES)[number];

export const SPACE_KINDS = ['room', 'container', 'shelf', 'appliance', 'outdoor'] as const;
export type SpaceKind = (typeof SPACE_KINDS)[number];

export const EQUIPMENT_KINDS = [
	'grow_container',
	'canner',
	'light',
	'fan',
	'humidifier',
	'controller',
	'meter',
	'fermenter',
	'other'
] as const;
export type EquipmentKind = (typeof EQUIPMENT_KINDS)[number];

export const BATCH_STATUSES = ['planned', 'active', 'done', 'failed'] as const;
export type BatchStatus = (typeof BATCH_STATUSES)[number];

export const READING_SOURCES = ['manual', 'sensor', 'import'] as const;
export type ReadingSource = (typeof READING_SOURCES)[number];

export const INVENTORY_STATUSES = ['in_stock', 'low', 'gone'] as const;
export type InventoryStatus = (typeof INVENTORY_STATUSES)[number];

/** Suggested phases per batch type. The batch phase is free text; these are only hints. */
export const PHASE_SUGGESTIONS: Record<BatchType, string[]> = {
	ferment: ['prep', 'primary ferment', 'secondary ferment', 'conditioning', 'aging', 'finished'],
	mushroom: ['spawn', 'colonization', 'fruiting setup', 'fruiting', 'harvest', 'cleanup'],
	hydroponic: ['germination', 'seedling', 'vegetative', 'flowering', 'harvest'],
	seedling: ['sown', 'germinated', 'true leaves', 'potted up', 'hardening off', 'transplanted'],
	preserve: ['prep', 'processing', 'cooling', 'stored']
};

/**
 * Batch types whose phase is picked from a fixed list with buttons (D27).
 * Only these get phase tasks and phase targets; other types keep free text.
 */
export const FIXED_PHASES: Partial<Record<BatchType, readonly string[]>> = {
	mushroom: PHASE_SUGGESTIONS.mushroom
};

export function fixedPhases(type: BatchType): readonly string[] | undefined {
	return FIXED_PHASES[type];
}

/** Batch types that can have protocols and batches today. The rest arrive in later phases. */
export const STARTABLE_TYPES = ['ferment', 'mushroom'] as const satisfies readonly BatchType[];
export type StartableType = (typeof STARTABLE_TYPES)[number];

export function isStartableType(value: string | null | undefined): value is StartableType {
	return (STARTABLE_TYPES as readonly string[]).includes(value ?? '');
}

/** Contamination events on a grow (D22). */
export const CONTAMINATION_KINDS = [
	'trich',
	'cobweb',
	'bacterial',
	'black_mold',
	'other_mold',
	'pests',
	'other'
] as const;
export type ContaminationKind = (typeof CONTAMINATION_KINDS)[number];

export const CONTAMINATION_SEVERITIES = ['spot', 'patch', 'widespread'] as const;
export type ContaminationSeverity = (typeof CONTAMINATION_SEVERITIES)[number];

export const CONTAMINATION_ACTIONS = ['watching', 'spot_treated', 'cut_out', 'tossed'] as const;
export type ContaminationAction = (typeof CONTAMINATION_ACTIONS)[number];

/** Words shown on the buttons; the stored values stay short. */
export const CONTAMINATION_LABELS: Record<string, string> = {
	trich: 'Trich (green)',
	cobweb: 'Cobweb',
	bacterial: 'Bacterial (wet, sour)',
	black_mold: 'Black mold',
	other_mold: 'Other mold',
	pests: 'Pests (gnats, mites)',
	other: 'Other',
	spot: 'Spot',
	patch: 'Patch',
	widespread: 'Widespread',
	watching: 'Watching',
	spot_treated: 'Spot treated',
	cut_out: 'Cut out',
	tossed: 'Tossed'
};

/** "grow_container" becomes "Grow container". */
export function label(value: string): string {
	const s = value.replace(/_/g, ' ');
	return s.charAt(0).toUpperCase() + s.slice(1);
}
