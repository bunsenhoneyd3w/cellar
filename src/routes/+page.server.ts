import { getDb } from '#lib/server/db/index.ts';
import { listBatches } from '#lib/server/batches.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({
	batches: listBatches(getDb(), { status: ['active', 'planned'] })
});
