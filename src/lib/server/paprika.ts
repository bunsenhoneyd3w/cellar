import { gunzipSync, strFromU8, unzipSync } from 'fflate';
import type { ProtocolBody } from '../protocol-body';
import { lines } from './form';

// Paprika exports come in two shapes:
//   .paprikarecipes  a zip holding one .paprikarecipe file per recipe
//   .paprikarecipe   a single recipe
// Each .paprikarecipe is gzipped JSON. Photos are embedded as base64 and are
// dropped here; Cellar keeps its own photos.

export type PaprikaRecipe = {
	uid: string;
	name: string;
	ingredients: string;
	directions: string;
	notes: string;
	source: string;
	sourceUrl: string;
	servings: string;
	prepTime: string;
	cookTime: string;
	totalTime: string;
	categories: string[];
};

const isGzip = (b: Uint8Array) => b[0] === 0x1f && b[1] === 0x8b;
const isZip = (b: Uint8Array) => b[0] === 0x50 && b[1] === 0x4b;

export function parsePaprikaFile(data: Uint8Array): PaprikaRecipe[] {
	if (isGzip(data)) return [readRecipe(data)];
	if (!isZip(data)) throw new Error('This does not look like a Paprika export file.');
	const files = unzipSync(data, { filter: (f) => f.name.endsWith('.paprikarecipe') });
	return Object.values(files)
		.map(readRecipe)
		.sort((a, b) => a.name.localeCompare(b.name));
}

function readRecipe(gz: Uint8Array): PaprikaRecipe {
	const raw = JSON.parse(strFromU8(isGzip(gz) ? gunzipSync(gz) : gz)) as Record<string, unknown>;
	const s = (k: string) => (typeof raw[k] === 'string' ? (raw[k] as string).trim() : '');
	const name = s('name') || 'Untitled recipe';
	return {
		// Every Paprika recipe has a uid; the name is only a fallback for hand-made files.
		uid: s('uid') || `name:${name}`,
		name,
		ingredients: s('ingredients'),
		directions: s('directions'),
		notes: s('notes'),
		source: s('source'),
		sourceUrl: s('source_url'),
		servings: s('servings'),
		prepTime: s('prep_time'),
		cookTime: s('cook_time'),
		totalTime: s('total_time'),
		categories: Array.isArray(raw.categories)
			? raw.categories.filter((c): c is string => typeof c === 'string')
			: []
	};
}

/** Turns a Paprika recipe into a protocol body. Target ranges are added by hand afterward. */
export function recipeToBody(r: PaprikaRecipe): ProtocolBody {
	return {
		ingredients: lines(r.ingredients),
		steps: lines(r.directions),
		targets: [],
		expectedDays: null,
		servings: r.servings || null,
		sourceUrl: r.sourceUrl || null,
		paprikaUid: r.uid || null
	};
}

/** Notes for the imported protocol: Paprika's notes plus where the recipe came from. */
export function recipeNotes(r: PaprikaRecipe): string | null {
	const parts = [
		r.notes,
		r.source && `Source: ${r.source}`,
		r.totalTime && `Total time: ${r.totalTime}`
	].filter(Boolean);
	return parts.length ? parts.join('\n\n') : null;
}
