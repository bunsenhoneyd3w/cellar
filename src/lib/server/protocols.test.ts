import { describe, expect, it } from 'vitest';
import { gzipSync, strToU8, zipSync } from 'fflate';
import { testDb } from './db/test-helpers';
import { parsePaprikaFile, recipeToBody } from './paprika';
import {
	createProtocol,
	getProtocol,
	getVersions,
	importRecipes,
	listProtocols,
	reviseProtocol
} from './protocols';
import { emptyBody } from '../protocol-body';

/** Builds a file shaped like a real Paprika export. */
function paprikaExport(recipes: Record<string, unknown>[]): Uint8Array {
	const files: Record<string, Uint8Array> = {};
	for (const r of recipes) {
		files[`${r.name}.paprikarecipe`] = gzipSync(strToU8(JSON.stringify(r)));
	}
	return zipSync(files);
}

const hotSauce = {
	uid: 'AAAA-1111',
	name: 'Fermented hot sauce',
	ingredients: '1 lb red Fresno peppers\n\n4 cloves garlic\n3.5% brine',
	directions: 'Chop peppers.\nPack into jar.\n\nCover with brine.',
	notes: 'Burp daily.',
	source: 'Serious Eats',
	source_url: 'https://example.com/hot-sauce',
	servings: '1 pint',
	total_time: '2 weeks',
	categories: ['Ferments'],
	photo_data: 'aGVsbG8='
};
const kraut = {
	uid: 'BBBB-2222',
	name: 'Sauerkraut',
	ingredients: '1 cabbage\n2% salt',
	directions: 'Shred and salt.'
};

describe('Paprika import', () => {
	it('reads every recipe from a .paprikarecipes zip', () => {
		const recipes = parsePaprikaFile(paprikaExport([kraut, hotSauce]));
		expect(recipes.map((r) => r.name)).toEqual(['Fermented hot sauce', 'Sauerkraut']);
		expect(recipes[0]).toMatchObject({
			uid: 'AAAA-1111',
			sourceUrl: 'https://example.com/hot-sauce'
		});
	});

	it('reads a single .paprikarecipe file', () => {
		const recipes = parsePaprikaFile(gzipSync(strToU8(JSON.stringify(kraut))));
		expect(recipes).toHaveLength(1);
		expect(recipes[0].name).toBe('Sauerkraut');
	});

	it('refuses a file that is not a Paprika export', () => {
		expect(() => parsePaprikaFile(strToU8('hello'))).toThrow(/Paprika/);
	});

	it('splits ingredients and directions into lines', () => {
		const body = recipeToBody(parsePaprikaFile(paprikaExport([hotSauce]))[0]);
		expect(body.ingredients).toEqual(['1 lb red Fresno peppers', '4 cloves garlic', '3.5% brine']);
		expect(body.steps).toEqual(['Chop peppers.', 'Pack into jar.', 'Cover with brine.']);
		expect(body.paprikaUid).toBe('AAAA-1111');
	});

	it('imports only the chosen recipes, as ferment protocols, and skips repeats', () => {
		const db = testDb();
		const recipes = parsePaprikaFile(paprikaExport([kraut, hotSauce]));
		const first = importRecipes(db, recipes, ['AAAA-1111']);
		expect(first).toHaveLength(1);
		expect(first[0]).toMatchObject({
			name: 'Fermented hot sauce',
			batchType: 'ferment',
			version: 1,
			source: 'Paprika import'
		});
		expect(first[0].notes).toContain('Burp daily.');

		const again = importRecipes(db, recipes, ['AAAA-1111', 'BBBB-2222']);
		expect(again.map((p) => p.name)).toEqual(['Sauerkraut']);
		expect(listProtocols(db)).toHaveLength(2);
	});
});

describe('protocol versions', () => {
	it('saves an edit as version 2 and leaves version 1 untouched', () => {
		const db = testDb();
		const v1 = createProtocol(db, {
			name: 'Kraut',
			batchType: 'ferment',
			bodyJson: { ...emptyBody(), ingredients: ['cabbage'], expectedDays: 21 }
		});
		const v2 = reviseProtocol(db, v1.id, {
			name: 'Kraut',
			batchType: 'ferment',
			bodyJson: { ...emptyBody(), ingredients: ['cabbage', 'caraway'], expectedDays: 28 }
		});

		expect(v2.id).not.toBe(v1.id);
		expect(v2).toMatchObject({ familyId: v1.familyId, version: 2 });
		expect(getProtocol(db, v1.id)?.bodyJson.ingredients).toEqual(['cabbage']);
		expect(getVersions(db, v1.familyId).map((p) => p.version)).toEqual([2, 1]);

		const list = listProtocols(db);
		expect(list).toHaveLength(1);
		expect(list[0]).toMatchObject({ id: v2.id, versions: 2 });
	});

	it('does not make a new version when nothing changed', () => {
		const db = testDb();
		const v1 = createProtocol(db, { name: 'Kraut', batchType: 'ferment', bodyJson: emptyBody() });
		const same = reviseProtocol(db, v1.id, {
			name: 'Kraut',
			batchType: 'ferment',
			bodyJson: emptyBody()
		});
		expect(same.id).toBe(v1.id);
	});

	it('editing an old version still builds on the newest one', () => {
		const db = testDb();
		const v1 = createProtocol(db, { name: 'A', batchType: 'ferment', bodyJson: emptyBody() });
		reviseProtocol(db, v1.id, { name: 'B', batchType: 'ferment', bodyJson: emptyBody() });
		const v3 = reviseProtocol(db, v1.id, {
			name: 'C',
			batchType: 'ferment',
			bodyJson: emptyBody()
		});
		expect(v3.version).toBe(3);
	});

	it('rejects a target range with min above max', () => {
		const db = testDb();
		expect(() =>
			createProtocol(db, {
				name: 'Bad',
				batchType: 'ferment',
				bodyJson: { ...emptyBody(), targets: [{ kind: 'ph', min: 4.6, max: 3.4, unit: 'pH' }] }
			})
		).toThrow(/minimum above/);
	});
});
