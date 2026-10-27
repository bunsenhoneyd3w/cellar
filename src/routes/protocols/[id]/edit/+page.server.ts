import { error, redirect } from '@sveltejs/kit';
import { getDb } from '#lib/server/db/index.ts';
import { getProtocol, reviseProtocol } from '#lib/server/protocols.ts';
import { readProtocolForm } from '#lib/server/protocol-form.ts';
import { inputFail } from '#lib/server/actions.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const protocol = getProtocol(getDb(), params.id);
	if (!protocol) error(404, 'Protocol not found');
	return { protocol };
};

export const actions: Actions = {
	default: async ({ request, params }) => {
		const db = getDb();
		const current = getProtocol(db, params.id);
		if (!current) error(404, 'Protocol not found');
		const fd = await request.formData();
		let id: string;
		try {
			id = reviseProtocol(db, params.id, readProtocolForm(fd, current.bodyJson)).id;
		} catch (e) {
			return inputFail(e);
		}
		redirect(303, `/protocols/${id}`);
	}
};
