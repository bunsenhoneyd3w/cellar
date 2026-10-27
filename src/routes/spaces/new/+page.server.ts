import { redirect } from '@sveltejs/kit';
import { getDb } from '#lib/server/db/index.ts';
import { createSpace, listSpaces } from '#lib/server/spaces.ts';
import { oneOf, str } from '#lib/server/form.ts';
import { inputFail } from '#lib/server/actions.ts';
import { SPACE_KINDS } from '#lib/enums.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({ spaces: listSpaces(getDb()) });

export const actions: Actions = {
	default: async ({ request }) => {
		const fd = await request.formData();
		try {
			createSpace(getDb(), {
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
