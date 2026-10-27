import { error } from '@sveltejs/kit';
import { getDb } from '#lib/server/db/index.ts';
import { getProtocol, getVersions } from '#lib/server/protocols.ts';
import { familyBatches } from '#lib/server/compare.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const db = getDb();
	const protocol = getProtocol(db, params.id);
	if (!protocol) error(404, 'Protocol not found');
	const versions = getVersions(db, protocol.familyId);
	return {
		protocol,
		versions,
		isLatest: versions[0].id === protocol.id,
		batches: familyBatches(db, protocol.familyId)
	};
};
