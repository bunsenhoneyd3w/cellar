import { fail, redirect } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { getDb } from '#lib/server/db/index.ts';
import { dataDir } from '#lib/server/paths.ts';
import { parsePaprikaFile, type PaprikaRecipe } from '#lib/server/paprika.ts';
import { importRecipes, importedPaprikaUids } from '#lib/server/protocols.ts';
import type { Actions } from './$types';

// Importing is two steps: upload the file and see its recipes, then tick the
// ones to bring in. Between the steps the parsed recipes wait in data/imports/
// so the phone does not have to upload the file twice.

const importsDir = () => path.join(dataDir(), 'imports');
const tokenPath = (token: string) => path.join(importsDir(), `${token}.json`);
const TOKEN = /^[0-9a-f-]{36}$/;

function clearOldImports() {
	const dir = importsDir();
	const dayAgo = Date.now() - 86_400_000;
	for (const f of readdirSync(dir)) {
		const p = path.join(dir, f);
		if (statSync(p).mtimeMs < dayAgo) rmSync(p, { force: true });
	}
}

export const actions: Actions = {
	preview: async ({ request }) => {
		const file = (await request.formData()).get('file');
		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { error: 'Choose a .paprikarecipes file first.' });
		}
		let recipes: PaprikaRecipe[];
		try {
			recipes = parsePaprikaFile(new Uint8Array(await file.arrayBuffer()));
		} catch {
			return fail(400, { error: 'That file could not be read as a Paprika export.' });
		}
		if (recipes.length === 0) return fail(400, { error: 'No recipes were found in that file.' });

		mkdirSync(importsDir(), { recursive: true });
		clearOldImports();
		const token = randomUUID();
		writeFileSync(tokenPath(token), JSON.stringify(recipes));

		const already = importedPaprikaUids(getDb());
		return {
			token,
			fileName: file.name,
			recipes: recipes.map((r) => ({
				uid: r.uid,
				name: r.name,
				categories: r.categories,
				imported: already.has(r.uid)
			}))
		};
	},

	import: async ({ request }) => {
		const fd = await request.formData();
		const token = String(fd.get('token') ?? '');
		const uids = fd.getAll('uid').map(String);
		if (!TOKEN.test(token)) return fail(400, { error: 'Upload the file again.' });
		if (uids.length === 0) return fail(400, { error: 'Tick at least one recipe.' });

		let recipes: PaprikaRecipe[];
		try {
			recipes = JSON.parse(readFileSync(tokenPath(token), 'utf8'));
		} catch {
			return fail(400, { error: 'That upload expired. Upload the file again.' });
		}
		const created = importRecipes(getDb(), recipes, uids);
		rmSync(tokenPath(token), { force: true });
		redirect(303, created.length === 1 ? `/protocols/${created[0].id}` : '/protocols');
	}
};
