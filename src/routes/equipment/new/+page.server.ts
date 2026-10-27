import { redirect } from '@sveltejs/kit';
import { getDb } from '#lib/server/db/index.ts';
import { createEquipment, parseSpecs } from '#lib/server/equipment.ts';
import { listSpaces } from '#lib/server/spaces.ts';
import { oneOf, str } from '#lib/server/form.ts';
import { inputFail } from '#lib/server/actions.ts';
import { EQUIPMENT_KINDS } from '#lib/enums.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({ spaces: listSpaces(getDb()) });

export const actions: Actions = {
	default: async ({ request }) => {
		const fd = await request.formData();
		try {
			createEquipment(getDb(), {
				name: str(fd, 'name') ?? '',
				kind: oneOf(fd, 'kind', EQUIPMENT_KINDS) ?? 'other',
				model: str(fd, 'model'),
				specsJson: parseSpecs(str(fd, 'specs')),
				spaceId: str(fd, 'spaceId'),
				notes: str(fd, 'notes')
			});
		} catch (e) {
			return inputFail(e);
		}
		redirect(303, '/equipment');
	}
};
