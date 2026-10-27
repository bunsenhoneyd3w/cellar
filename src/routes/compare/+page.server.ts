import { getDb } from '#lib/server/db/index.ts';
import { getBatch, listBatches } from '#lib/server/batches.ts';
import { compareBatches, compareCandidates } from '#lib/server/compare.ts';
import { BATCH_TYPES, STARTABLE_TYPES, type BatchType } from '#lib/enums.ts';
import { MAX_COMPARE } from '#lib/compare.ts';
import type { PageServerLoad } from './$types';

// GET /compare?b=<id>&b=<id> shows a comparison (D39 to D41). With fewer than
// two batches, ?from=<id>, ?type=<type>, or ?pick, it shows the picker
// instead. Plain links and a GET form, so there are no form actions and the
// query string is never lost.

const isType = (v: string | null): v is BatchType =>
	(BATCH_TYPES as readonly string[]).includes(v ?? '');

export const load: PageServerLoad = ({ url }) => {
	const db = getDb();
	const ids = url.searchParams.getAll('b').filter(Boolean);
	const from = url.searchParams.get('from');
	const picking = url.searchParams.has('pick') || !!from || ids.length < 2;

	if (!picking) {
		const comparison = compareBatches(db, ids);
		if (comparison.batches.length >= 2) return { mode: 'compare' as const, comparison };
	}

	const anchor = getBatch(db, from ?? ids[0] ?? '');
	const typeParam = url.searchParams.get('type');
	const type = anchor?.batchType ?? (isType(typeParam) ? typeParam : null);
	if (!type) {
		// Nothing picked yet: offer the types that have two or more batches.
		const types = STARTABLE_TYPES.map((t) => ({
			type: t,
			count: listBatches(db, { type: t }).length
		}));
		return { mode: 'types' as const, types: types.filter((t) => t.count >= 2) };
	}

	const family = anchor?.protocolSnapshotJson?.familyId ?? null;
	const candidates = compareCandidates(db, type, family);
	// From a batch, it and its protocol's other batches start ticked (D40).
	const ticked = ids.length
		? ids
		: anchor
			? [
					anchor.id,
					...candidates.filter((c) => c.sameProtocol && c.id !== anchor.id).map((c) => c.id)
				]
			: [];
	return {
		mode: 'pick' as const,
		type,
		candidates,
		ticked: ticked.slice(0, MAX_COMPARE),
		tooFew: !picking
	};
};
