import { getDb } from '#lib/server/db/index.ts';
import { listInventory } from '#lib/server/inventory.ts';
import { inventoryActions } from '#lib/server/inventory-actions.ts';
import { localDate } from '#lib/time.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
	const showGone = url.searchParams.has('gone');
	return {
		view: url.searchParams.get('view') === 'use-by' ? ('use-by' as const) : ('shelf' as const),
		showGone,
		today: localDate(),
		items: listInventory(getDb(), { includeGone: showGone })
	};
};

export const actions: Actions = { ...inventoryActions };
