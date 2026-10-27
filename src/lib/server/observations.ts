import { eq } from 'drizzle-orm';
import type { Db } from './db';
import { batch, contamination, observation, photo, reading } from './db/schema';
import { HARVEST_KIND, readingKind } from '../reading-kinds';
import {
	CONTAMINATION_ACTIONS,
	CONTAMINATION_KINDS,
	CONTAMINATION_SEVERITIES,
	type ContaminationAction,
	type ContaminationKind,
	type ContaminationSeverity
} from '../enums';
import { nowIso } from '../time';
import { InputError } from './form';
import { getBatch } from './batches';
import type { SavedPhoto } from './photos';
import { applyPhaseChange, completeTask, getTask } from './tasks';
import { nextFlush } from './grows';

export type ReadingInput = { kind: string; value: number; unit: string };

export type ContaminationInput = {
	kind: ContaminationKind;
	severity: ContaminationSeverity;
	action: ContaminationAction;
};

export type ObservationInput = {
	batchId: string;
	observedAt?: string | null;
	phase?: string | null;
	note?: string | null;
	readings?: ReadingInput[];
	photos?: SavedPhoto[];
	contaminations?: ContaminationInput[];
	/** Flush of a harvest (D23). Left empty, a harvest goes to the next flush. */
	flush?: number | null;
};

function hasContent(input: ObservationInput) {
	return (
		!!input.note ||
		!!input.readings?.length ||
		!!input.photos?.length ||
		!!input.contaminations?.length
	);
}

/**
 * Saves a check-in on a batch with its readings, photos, and contamination
 * events in one go. A phase different from the batch's current phase moves
 * the batch to it. A harvest weight gets a flush number, the next one unless
 * the check-in names one.
 */
export function createObservation(db: Db, input: ObservationInput) {
	const readings = input.readings ?? [];
	const photos = input.photos ?? [];
	const contaminations = input.contaminations ?? [];
	if (!hasContent(input)) {
		throw new InputError('Add a note, a reading, or a photo.');
	}
	for (const r of readings) {
		if (!readingKind(r.kind)) throw new InputError(`Unknown reading kind: ${r.kind}`);
		if (!Number.isFinite(r.value)) throw new InputError(`The ${r.kind} reading is not a number.`);
		if (!r.unit) throw new InputError(`The ${r.kind} reading has no unit.`);
	}
	for (const c of contaminations) {
		if (
			!CONTAMINATION_KINDS.includes(c.kind) ||
			!CONTAMINATION_SEVERITIES.includes(c.severity) ||
			!CONTAMINATION_ACTIONS.includes(c.action)
		) {
			throw new InputError('Pick what the contamination is, how bad, and what you did.');
		}
	}
	const harvest = readings.filter((r) => r.kind === HARVEST_KIND);
	if (harvest.some((r) => r.value <= 0)) throw new InputError('A harvest weighs more than 0.');
	if (input.flush != null) {
		if (!harvest.length) throw new InputError(`Add the harvest weight for flush ${input.flush}.`);
		if (!Number.isInteger(input.flush) || input.flush < 1) {
			throw new InputError('The flush is a whole number, 1 or more.');
		}
	}

	return db.transaction((tx) => {
		const b = getBatch(tx, input.batchId);
		if (!b) throw new InputError('That batch no longer exists.');
		const observedAt = input.observedAt ?? nowIso();
		const phase = input.phase ?? b.phase;

		const flush = harvest.length ? (input.flush ?? nextFlush(tx, b.id)) : null;

		const obs = tx
			.insert(observation)
			.values({ batchId: b.id, observedAt, phase, note: input.note ?? null, flush })
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
		if (contaminations.length) {
			tx.insert(contamination)
				.values(contaminations.map((c) => ({ observationId: obs.id, ...c })))
				.run();
		}
		if (phase !== b.phase) {
			tx.update(batch).set({ phase }).where(eq(batch.id, b.id)).run();
			applyPhaseChange(tx, b, phase, observedAt);
		}
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
	const content = hasContent(input);
	if (!taskIds.length) return { observation: createObservation(db, input), tasksDone: 0 };

	return db.transaction((tx) => {
		const b = getBatch(tx, input.batchId);
		if (!b) throw new InputError('That batch no longer exists.');
		if (!content && input.phase && input.phase !== b.phase) {
			throw new InputError('Add a note to go with the phase change.');
		}
		const observedAt = input.observedAt ?? nowIso();
		for (const id of taskIds) {
			if (getTask(tx, id)?.batchId !== b.id) {
				throw new InputError('One of the ticked tasks is not on this batch.');
			}
			completeTask(tx, id, observedAt);
		}
		const observation = content ? createObservation(tx, { ...input, observedAt }) : null;
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
