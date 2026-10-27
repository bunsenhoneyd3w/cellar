import path from 'node:path';
import { getDb } from '#lib/server/db/index.ts';
import { tableCounts } from '#lib/server/export.ts';
import { dataDir, photosDir } from '#lib/server/paths.ts';
import { recognitionOn, visionModel } from '#lib/server/recognize.ts';
import { str } from '#lib/server/form.ts';
import { readTheme, THEME_COOKIE } from '#lib/theme.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ cookies }) => ({
	tables: tableCounts(getDb()),
	dbFile: path.join(dataDir(), 'cellar.db'),
	photosDir: photosDir(),
	photoReading: { on: recognitionOn(), model: visionModel() },
	theme: readTheme(cookies.get(THEME_COOKIE))
});

export const actions: Actions = {
	// Light, dark, or follow the phone (D50). Kept on this phone only.
	theme: async ({ request, cookies }) => {
		const theme = readTheme(str(await request.formData(), 'theme'));
		// Plain HTTP on the home network (D16), so the cookie cannot be marked secure.
		const options = { path: '/', secure: false, httpOnly: true, sameSite: 'lax' as const };
		if (theme) cookies.set(THEME_COOKIE, theme, { ...options, maxAge: 60 * 60 * 24 * 365 });
		else cookies.delete(THEME_COOKIE, options);
	}
};
