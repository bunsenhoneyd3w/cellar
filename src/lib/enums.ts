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

/** "grow_container" becomes "Grow container". */
export function label(value: string): string {
	const s = value.replace(/_/g, ' ');
	return s.charAt(0).toUpperCase() + s.slice(1);
}
