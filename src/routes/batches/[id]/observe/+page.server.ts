import { error, redirect } from '@sveltejs/kit';
import { getDb } from '#lib/server/db/index.ts';
import { getBatchDetail } from '#lib/server/batches.ts';
import { saveCheckIn, type ReadingInput } from '#lib/server/observations.ts';
import { listOpenTasks } from '#lib/server/tasks.ts';
import { deletePhotoFiles, savePhoto, type SavedPhoto } from '#lib/server/photos.ts';
import { num, str } from '#lib/server/form.ts';
import { inputFail } from '#lib/server/actions.ts';
import { kindsFor } from '#lib/reading-kinds.ts';
import { PHASE_SUGGESTIONS } from '#lib/enums.ts';
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
	const kinds = kindsFor(b.batchType).sort(
		(a, c) => Number(used.has(c.kind)) - Number(used.has(a.kind))
	);
	const last: Record<string, number> = {};
	for (const r of detail.readings) last[r.kind] = r.value;

	return {
		batch: b,
		kinds,
		last,
		targets: b.protocolSnapshotJson?.body.targets ?? [],
		phases: PHASE_SUGGESTIONS[b.batchType],
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
			saveCheckIn(db, {
				batchId: params.id,
				observedAt,
				phase: str(fd, 'phase'),
				note: str(fd, 'note'),
				readings,
				photos: saved,
				taskIds: fd.getAll('taskId').filter((v): v is string => typeof v === 'string')
			});
		} catch (e) {
			deletePhotoFiles(saved.flatMap((s) => [s.path, s.originalPath]));
			return inputFail(e);
		}
		redirect(303, `/batches/${params.id}`);
	}
};
