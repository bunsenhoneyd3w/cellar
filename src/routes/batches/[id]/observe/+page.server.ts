import { error, redirect } from '@sveltejs/kit';
import { getDb } from '#lib/server/db/index.ts';
import { getBatchDetail } from '#lib/server/batches.ts';
import { saveCheckIn, type ReadingInput } from '#lib/server/observations.ts';
import { readContaminations } from '#lib/server/check-in-form.ts';
import { nextFlush } from '#lib/server/grows.ts';
import { listOpenTasks } from '#lib/server/tasks.ts';
import { deletePhotoFiles, savePhoto, type SavedPhoto } from '#lib/server/photos.ts';
import { num, str } from '#lib/server/form.ts';
import { inputFail } from '#lib/server/actions.ts';
import { HARVEST_KIND, kindsFor, readingKind, trackedKindsFor } from '#lib/reading-kinds.ts';
import { PHASE_SUGGESTIONS, fixedPhases } from '#lib/enums.ts';
import { fromLocalInput, localDate } from '#lib/time.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const detail = getBatchDetail(getDb(), params.id);
	if (!detail) error(404, 'Batch not found');
	const b = detail.batch;

	// Kinds with a protocol target or used on this batch before go first.
	const used = new Set([
		...detail.readings.map((r) => r.kind),
		...(b.protocolSnapshotJson?.body.targets.map((t) => t.kind) ?? [])
	]);
	const kinds = trackedKindsFor(b.batchType).sort(
		(a, c) => Number(used.has(c.kind)) - Number(used.has(a.kind))
	);
	const last: Record<string, number> = {};
	for (const r of detail.readings) last[r.kind] = r.value;

	const grow = b.batchType === 'mushroom';
	return {
		batch: b,
		kinds,
		last,
		targets: b.protocolSnapshotJson?.body.targets ?? [],
		phases: PHASE_SUGGESTIONS[b.batchType],
		fixedPhases: fixedPhases(b.batchType),
		// Grows get the harvest and contamination parts of the check-in (D22, D23).
		harvest: grow ? readingKind(HARVEST_KIND) : undefined,
		nextFlush: grow ? nextFlush(getDb(), b.id) : null,
		lastFlush: detail.flushes.flushes.at(-1),
		contamination: grow,
		dueTasks: listOpenTasks(getDb(), { batchId: b.id, dueThrough: localDate() })
	};
};

export const actions: Actions = {
	default: async ({ request, params }) => {
		const fd = await request.formData();
		const db = getDb();
		const detail = getBatchDetail(db, params.id);
		if (!detail) error(404, 'Batch not found');

		const readings: ReadingInput[] = [];
		for (const k of kindsFor(detail.batch.batchType)) {
			const value = num(fd, `r_${k.kind}`);
			if (value !== null) readings.push({ kind: k.kind, value, unit: k.unit });
		}

		const observedAt = fromLocalInput(str(fd, 'observedAt'));
		const files = fd.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0);
		const saved: SavedPhoto[] = [];
		for (const f of files) {
			saved.push(
				await savePhoto(
					new Uint8Array(await f.arrayBuffer()),
					f.name,
					f.type,
					observedAt ? new Date(observedAt) : new Date()
				)
			);
		}

		try {
			const harvested = readings.some((r) => r.kind === HARVEST_KIND);
			saveCheckIn(db, {
				batchId: params.id,
				observedAt,
				phase: str(fd, 'phase'),
				note: str(fd, 'note'),
				readings,
				photos: saved,
				contaminations: readContaminations(fd),
				// The flush stepper always posts; it only counts with a harvest weight.
				flush: harvested ? num(fd, 'flush') : null,
				taskIds: fd.getAll('taskId').filter((v): v is string => typeof v === 'string')
			});
		} catch (e) {
			deletePhotoFiles(saved.flatMap((s) => [s.path, s.originalPath]));
			return inputFail(e);
		}
		redirect(303, `/batches/${params.id}`);
	}
};
