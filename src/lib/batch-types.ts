import type { BatchType } from './enums';

// How each batch type looks (D49): a word, an icon, and a color pair. The
// colors are named in src/routes/layout.css as --color-<type>-bg and
// --color-<type>-ink, with dark values there too.

export type TypeIcon = 'bottle' | 'mushroom' | 'plant-2' | 'seedling' | 'container';

export const BATCH_TYPE_LOOK: Record<BatchType, { word: string; icon: TypeIcon }> = {
	ferment: { word: 'Ferment', icon: 'bottle' },
	mushroom: { word: 'Mushroom', icon: 'mushroom' },
	hydroponic: { word: 'Tower', icon: 'plant-2' },
	seedling: { word: 'Seedling', icon: 'seedling' },
	preserve: { word: 'Preserve', icon: 'container' }
};

/** Tailwind classes for a type's chip or tinted square. Written out in full so Tailwind sees them. */
export const TYPE_CLASSES: Record<BatchType, string> = {
	ferment: 'bg-ferment-bg text-ferment-ink',
	mushroom: 'bg-mushroom-bg text-mushroom-ink',
	hydroponic: 'bg-hydroponic-bg text-hydroponic-ink',
	seedling: 'bg-seedling-bg text-seedling-ink',
	preserve: 'bg-preserve-bg text-preserve-ink'
};
