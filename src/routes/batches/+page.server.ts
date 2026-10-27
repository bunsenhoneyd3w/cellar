import { getDb } from '#lib/server/db/index.ts';
import { listBatches } from '#lib/server/batches.ts';
import type { BatchStatus } from '#lib/enums.ts';
import type { PageServerLoad } from './$types';

const FILTERS: Record<string, BatchStatus[] | undefined> = {
	active: ['active', 'planned'],
	finished: ['done', 'failed'],
	all: undefined
};

export const load: PageServerLoad = ({ url }) => {
	const show = url.searchParams.get('show') ?? 'active';
	const status = show in FILTERS ? FILTERS[show] : FILTERS.active;
	return { show, batches: listBatches(getDb(), { status }) };
};
