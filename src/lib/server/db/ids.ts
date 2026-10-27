import { randomInt } from 'node:crypto';

// Readable ids (D13): a short table prefix plus 10 random characters,
// e.g. bat_7k2m9qx4hp. The alphabet skips 0, 1, i, l, and o so ids are easy
// to read back off a phone screen.

const ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';
const LENGTH = 10;

export const ID_PREFIXES = {
	space: 'spc',
	equipment: 'eqp',
	protocol: 'pro',
	protocolFamily: 'prf',
	batch: 'bat',
	observation: 'obs',
	reading: 'rdg',
	photo: 'pho',
	contamination: 'ctm',
	outcome: 'out',
	inventoryItem: 'inv',
	task: 'tsk'
} as const;

export type IdPrefix = (typeof ID_PREFIXES)[keyof typeof ID_PREFIXES];

export function newId(prefix: IdPrefix): string {
	let s = '';
	for (let i = 0; i < LENGTH; i++) s += ALPHABET[randomInt(ALPHABET.length)];
	return `${prefix}_${s}`;
}
