import { eq } from 'drizzle-orm';
import type { Db } from './db';
import { batch, outcome } from './db/schema';
import { nowIso } from '../time';
import { InputError } from './form';
import { getBatch } from './batches';

export type OutcomeInput = {
	status: 'done' | 'failed';
	endedAt?: string | null;
	yieldValue?: number | null;
	yieldUnit?: string | null;
	rating?: number | null;
	summary?: string | null;
	wouldChange?: string | null;
};

/**
 * Ends a batch: writes its one outcome and sets status and end time together.
 * Running it again on a finished batch edits the outcome.
 */
export function finishBatch(db: Db, batchId: string, input: OutcomeInput) {
	if (
		input.rating != null &&
		!(Number.isInteger(input.rating) && input.rating >= 1 && input.rating <= 5)
	) {
		throw new InputError('Rating is 1 to 5.');
	}
	if (input.yieldValue != null && input.yieldValue < 0)
		throw new InputError('Yield cannot be negative.');
	if (input.yieldValue != null && !input.yieldUnit) throw new InputError('Give the yield a unit.');

	return db.transaction((tx) => {
		const b = getBatch(tx, batchId);
		if (!b) throw new InputError('That batch no longer exists.');
		const endedAt = input.endedAt ?? b.endedAt ?? nowIso();
		if (b.startedAt && new Date(endedAt) < new Date(b.startedAt)) {
			throw new InputError('The end date is before Day 0.');
		}

		tx.update(batch).set({ status: input.status, endedAt }).where(eq(batch.id, batchId)).run();
		const values = {
			yieldValue: input.yieldValue ?? null,
			yieldUnit: input.yieldValue != null ? (input.yieldUnit ?? null) : null,
			rating: input.rating ?? null,
			summary: input.summary ?? null,
			wouldChange: input.wouldChange ?? null
		};
		return tx
			.insert(outcome)
			.values({ batchId, ...values })
			.onConflictDoUpdate({ target: outcome.batchId, set: values })
			.returning()
			.get();
	});
}

/** Puts a finished batch back to active, for a batch ended by mistake. The outcome is kept. */
export function reopenBatch(db: Db, batchId: string) {
	db.update(batch).set({ status: 'active', endedAt: null }).where(eq(batch.id, batchId)).run();
}
