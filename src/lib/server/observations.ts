import { eq } from 'drizzle-orm';
import type { Db } from './db';
import { batch, observation, photo, reading } from './db/schema';
import { readingKind } from '../reading-kinds';
import { nowIso } from '../time';
import { InputError } from './form';
import { getBatch } from './batches';
import type { SavedPhoto } from './photos';
import { completeTask, getTask } from './tasks';

export type ReadingInput = { kind: string; value: number; unit: string };

export type ObservationInput = {
	batchId: string;
	observedAt?: string | null;
	phase?: string | null;
	note?: string | null;
	readings?: ReadingInput[];
	photos?: SavedPhoto[];
};

/**
 * Saves a check-in on a batch with its readings and photos in one go. A
 * phase different from the batch's current phase moves the batch to it.
 */
export function createObservation(db: Db, input: ObservationInput) {
	const readings = input.readings ?? [];
	const photos = input.photos ?? [];
	if (!input.note && readings.length === 0 && photos.length === 0) {
		throw new InputError('Add a note, a reading, or a photo.');
	}
	for (const r of readings) {
		if (!readingKind(r.kind)) throw new InputError(`Unknown reading kind: ${r.kind}`);
		if (!Number.isFinite(r.value)) throw new InputError(`The ${r.kind} reading is not a number.`);
		if (!r.unit) throw new InputError(`The ${r.kind} reading has no unit.`);
	}

	return db.transaction((tx) => {
		const b = getBatch(tx, input.batchId);
		if (!b) throw new InputError('That batch no longer exists.');
		const observedAt = input.observedAt ?? nowIso();
		const phase = input.phase ?? b.phase;

		const obs = tx
			.insert(observation)
			.values({ batchId: b.id, observedAt, phase, note: input.note ?? null })
			.returning()
			.get();
		if (readings.length) {
			tx.insert(reading)
				.values(
					readings.map((r) => ({
						observationId: obs.id,
						kind: r.kind,
						value: r.value,
						unit: r.unit,
						takenAt: observedAt,
						source: 'manual' as const
					}))
				)
				.run();
		}
		if (photos.length) {
			tx.insert(photo)
				.values(
					photos.map((p) => ({
						id: p.id,
						observationId: obs.id,
						path: p.path,
						originalPath: p.originalPath,
						takenAt: observedAt
					}))
				)
				.run();
		}
		if (phase !== b.phase) tx.update(batch).set({ phase }).where(eq(batch.id, b.id)).run();
		return obs;
	});
}

/**
 * What the new observation screen saves: an observation plus any tasks ticked
 * on it, done at the observation time. Ticking tasks with no note, reading,
 * or photo marks them done without writing an empty observation.
 */
export function saveCheckIn(db: Db, input: ObservationInput & { taskIds?: string[] }) {
	const taskIds = [...new Set(input.taskIds ?? [])];
	const hasContent = !!input.note || !!input.readings?.length || !!input.photos?.length;
	if (!taskIds.length) return { observation: createObservation(db, input), tasksDone: 0 };

	return db.transaction((tx) => {
		const b = getBatch(tx, input.batchId);
		if (!b) throw new InputError('That batch no longer exists.');
		if (!hasContent && input.phase && input.phase !== b.phase) {
			throw new InputError('Add a note to go with the phase change.');
		}
		const observedAt = input.observedAt ?? nowIso();
		for (const id of taskIds) {
			if (getTask(tx, id)?.batchId !== b.id) {
				throw new InputError('One of the ticked tasks is not on this batch.');
			}
			completeTask(tx, id, observedAt);
		}
		const observation = hasContent ? createObservation(tx, { ...input, observedAt }) : null;
		return { observation, tasksDone: taskIds.length };
	});
}

export function getObservation(db: Db, id: string) {
	return db.select().from(observation).where(eq(observation.id, id)).get();
}

/** Deletes an observation and its readings and photo rows; returns photo paths so the files can go too. */
export function deleteObservation(db: Db, id: string): string[] {
	return db.transaction((tx) => {
		const files = tx
			.select({ path: photo.path, originalPath: photo.originalPath })
			.from(photo)
			.where(eq(photo.observationId, id))
			.all()
			.flatMap((p) => [p.path, p.originalPath])
			.filter((p): p is string => !!p);
		tx.delete(observation).where(eq(observation.id, id)).run();
		return files;
	});
}
