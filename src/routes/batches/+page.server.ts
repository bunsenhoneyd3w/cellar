import { getDb } from '#lib/server/db/index.ts';
import { listBatches } from '#lib/server/batches.ts';
import { listSpaces, spaceAndInside } from '#lib/server/spaces.ts';
import { BATCH_TYPES, type BatchStatus } from '#lib/enums.ts';
import type { PageServerLoad } from './$types';

const FILTERS: Record<string, BatchStatus[] | undefined> = {
	active: ['active', 'planned'],
	finished: ['done', 'failed'],
	all: undefined
};

export const load: PageServerLoad = ({ url }) => {
	const db = getDb();
	const show = url.searchParams.get('show') ?? 'active';
	const status = show in FILTERS ? FILTERS[show] : FILTERS.active;
	const type = BATCH_TYPES.find((t) => t === url.searchParams.get('type'));
	const spaces = listSpaces(db);
	const space = spaces.find((s) => s.id === url.searchParams.get('space'));
	return {
		show,
		type: type ?? null,
		space: space?.id ?? null,
		spaces,
		// Types that have any batches, so the filter only offers what exists.
		types: BATCH_TYPES.filter((t) => listBatches(db, { type: t }).length > 0),
		batches: listBatches(db, {
			status,
			type,
			spaceIds: space ? spaceAndInside(spaces, space.id) : undefined
		})
	};
};
