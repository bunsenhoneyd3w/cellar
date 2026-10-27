import type { BatchType } from './enums';

const TYPE_WORD: Record<BatchType, string> = {
	ferment: 'Ferment',
	mushroom: 'Grow',
	hydroponic: 'Tower',
	seedling: 'Seedling',
	preserve: 'Preserve'
};

/** "Ferment 003 Classic sauerkraut" */
export function batchName(type: BatchType, n: number, protocolName: string): string {
	return `${TYPE_WORD[type]} ${String(n).padStart(3, '0')} ${protocolName}`;
}
