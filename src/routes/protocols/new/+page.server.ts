import { redirect } from '@sveltejs/kit';
import { getDb } from '#lib/server/db/index.ts';
import { createProtocol } from '#lib/server/protocols.ts';
import { readProtocolForm } from '#lib/server/protocol-form.ts';
import { inputFail } from '#lib/server/actions.ts';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request }) => {
		const fd = await request.formData();
		let id: string;
		try {
			id = createProtocol(getDb(), readProtocolForm(fd)).id;
		} catch (e) {
			return inputFail(e);
		}
		redirect(303, `/protocols/${id}`);
	}
};
