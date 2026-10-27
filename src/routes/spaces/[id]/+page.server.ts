import { error, redirect } from '@sveltejs/kit';
import { getDb } from '#lib/server/db/index.ts';
import { getSpace, listSpaces, updateSpace } from '#lib/server/spaces.ts';
import { listInventory } from '#lib/server/inventory.ts';
import { oneOf, str } from '#lib/server/form.ts';
import { inputFail } from '#lib/server/actions.ts';
import { SPACE_KINDS } from '#lib/enums.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const db = getDb();
	const space = getSpace(db, params.id);
	if (!space) error(404, 'Space not found');
	return { space, spaces: listSpaces(db), items: listInventory(db, { spaceId: params.id }) };
};

export const actions: Actions = {
	default: async ({ request, params }) => {
		const fd = await request.formData();
		try {
			updateSpace(getDb(), params.id, {
				name: str(fd, 'name') ?? '',
				kind: oneOf(fd, 'kind', SPACE_KINDS) ?? 'room',
				parentSpaceId: str(fd, 'parentSpaceId'),
				notes: str(fd, 'notes')
			});
		} catch (e) {
			return inputFail(e);
		}
		redirect(303, '/spaces');
	}
};
