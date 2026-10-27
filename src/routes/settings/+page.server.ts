import path from 'node:path';
import { getDb } from '#lib/server/db/index.ts';
import { tableCounts } from '#lib/server/export.ts';
import { dataDir, photosDir } from '#lib/server/paths.ts';
import { recognitionOn, visionModel } from '#lib/server/recognize.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({
	tables: tableCounts(getDb()),
	dbFile: path.join(dataDir(), 'cellar.db'),
	photosDir: photosDir(),
	photoReading: { on: recognitionOn(), model: visionModel() }
});
