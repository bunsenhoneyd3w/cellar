import { and, asc, eq, inArray, isNotNull, isNull, lte, ne, or, sql } from 'drizzle-orm';
import type { Db } from './db';
import { batch, task } from './db/schema';
import { bodyTasks, type TaskTemplate } from '../protocol-body';
import { recurrenceDays, recurrenceFor } from '../recurrence';
import { addDays, daysBetween, isDate, localDate, nowIso } from '../time';
import { InputError } from './form';
import type { Batch } from './batches';

export type Task = typeof task.$inferSelect;

export type TaskInput = {
	title: string;
	batchId?: string | null;
	dueAt?: string | null;
	recurrence?: string | null;
	repeatUntil?: string | null;
};

/** Checks a task form and returns the values to store, with the repeat in its stored wording. */
function clean(db: Db, input: TaskInput) {
	const title = input.title.trim();
	if (!title) throw new InputError('Give the task a name.');
	const dueAt = input.dueAt || null;
	if (dueAt && !isDate(dueAt)) throw new InputError('The due date is not a real date.');

	let recurrence: string | null = null;
	if (input.recurrence) {
		const days = recurrenceDays(input.recurrence);
		if (days === null) throw new InputError('Repeat every 1 to 365 days.');
		recurrence = recurrenceFor(days);
		if (!dueAt) throw new InputError('A repeating task needs a first due date.');
	}

	const repeatUntil = recurrence ? input.repeatUntil || null : null;
	if (repeatUntil && !isDate(repeatUntil))
		throw new InputError('The stop date is not a real date.');
	if (repeatUntil && dueAt && repeatUntil < dueAt) {
		throw new InputError('The repeat stops before the first due date.');
	}

	const batchId = input.batchId || null;
	if (batchId && !db.select({ id: batch.id }).from(batch).where(eq(batch.id, batchId)).get()) {
		throw new InputError('That batch no longer exists.');
	}
	return { title, batchId, dueAt, recurrence, repeatUntil };
}

export function createTask(db: Db, input: TaskInput): Task {
	return db.insert(task).values(clean(db, input)).returning().get();
}

export function updateTask(db: Db, id: string, input: TaskInput): Task {
	const values = clean(db, input);
	if (!getTask(db, id)) throw new InputError('That task no longer exists.');
	return db.update(task).set(values).where(eq(task.id, id)).returning().get();
}

export function getTask(db: Db, id: string): Task | undefined {
	return db.select().from(task).where(eq(task.id, id)).get();
}

export function deleteTask(db: Db, id: string) {
	db.delete(task).where(eq(task.id, id)).run();
}

/**
 * Marks a task done. A repeating task gets its next copy, due the repeat
 * interval after the day it was done (D17), so doing it late never leaves a
 * pile of missed copies. No copy is made past the stop date.
 */
export function completeTask(db: Db, id: string, doneAt: string = nowIso()) {
	return db.transaction((tx) => {
		const t = getTask(tx, id);
		if (!t) throw new InputError('That task no longer exists.');
		if (t.doneAt) return { task: t, next: undefined };

		const done = tx.update(task).set({ doneAt }).where(eq(task.id, id)).returning().get();
		const days = recurrenceDays(t.recurrence);
		let next: Task | undefined;
		if (days !== null) {
			const dueAt = addDays(localDate(doneAt), days);
			if (!t.repeatUntil || dueAt <= t.repeatUntil) {
				next = tx
					.insert(task)
					.values({
						batchId: t.batchId,
						title: t.title,
						dueAt,
						recurrence: t.recurrence,
						repeatUntil: t.repeatUntil,
						previousTaskId: t.id,
						phase: t.phase
					})
					.returning()
					.get();
			}
		}
		return { task: done, next };
	});
}

/** Takes back a Done tapped by mistake, removing the next copy it made. */
export function undoTask(db: Db, id: string): Task {
	return db.transaction((tx) => {
		const t = getTask(tx, id);
		if (!t) throw new InputError('That task no longer exists.');
		if (!t.doneAt) return t;
		const next = tx.select().from(task).where(eq(task.previousTaskId, id)).get();
		if (next?.doneAt) {
			throw new InputError('The next repeat is already done, so this one cannot be undone.');
		}
		if (next) tx.delete(task).where(eq(task.id, next.id)).run();
		return tx.update(task).set({ doneAt: null }).where(eq(task.id, id)).returning().get();
	});
}

export type OpenTask = Task & { batchName: string | null };

/**
 * Tasks not done yet, soonest first, with undated ones last. Tasks on a
 * finished batch are left out but kept, so reopening the batch brings them back.
 * A phase task shows only while its batch is in that phase (D26).
 */
export function listOpenTasks(
	db: Db,
	filter: { batchId?: string; dueThrough?: string } = {}
): OpenTask[] {
	return db
		.select({ task, batchName: batch.name })
		.from(task)
		.leftJoin(batch, eq(task.batchId, batch.id))
		.where(
			and(
				isNull(task.doneAt),
				or(isNull(task.batchId), inArray(batch.status, ['planned', 'active'])),
				or(isNull(task.phase), eq(task.phase, batch.phase)),
				filter.batchId ? eq(task.batchId, filter.batchId) : undefined,
				filter.dueThrough ? lte(task.dueAt, filter.dueThrough) : undefined
			)
		)
		.orderBy(sql`${task.dueAt} is null`, asc(task.dueAt), asc(task.createdAt))
		.all()
		.map((r) => ({ ...r.task, batchName: r.batchName }));
}

export const UPCOMING_DAYS = 7;

/** Open tasks grouped the way the Today screen shows them. */
export function todayTasks(db: Db, today: string = localDate()) {
	const open = listOpenTasks(db);
	const soon = addDays(today, UPCOMING_DAYS);
	return {
		overdue: open.filter((t) => t.dueAt && t.dueAt < today),
		today: open.filter((t) => t.dueAt === today),
		upcoming: open.filter((t) => t.dueAt && t.dueAt > today && t.dueAt <= soon),
		undated: open.filter((t) => !t.dueAt)
	};
}

/**
 * Task rows for templates whose day count starts on `base`. A start in the
 * past (a batch or check-in entered after the fact) moves a repeating task to
 * its first repeat on or after today and skips a one-off.
 */
function rowsFromTemplates(
	batchId: string,
	templates: TaskTemplate[],
	base: string,
	today: string
) {
	const rows = [];
	for (const tpl of templates) {
		const days = recurrenceDays(tpl.recurrence);
		const repeatUntil =
			days !== null && tpl.endDay !== null && !tpl.phase ? addDays(base, tpl.endDay) : null;
		let dueAt = addDays(base, tpl.startDay);
		if (dueAt < today) {
			if (days === null) continue;
			dueAt = addDays(dueAt, Math.ceil(daysBetween(dueAt, today) / days) * days);
		}
		if (repeatUntil && dueAt > repeatUntil) continue;
		rows.push({
			batchId,
			title: tpl.title,
			dueAt,
			recurrence: days !== null ? recurrenceFor(days) : null,
			repeatUntil,
			phase: tpl.phase ?? null
		});
	}
	return rows;
}

/**
 * Creates the tasks a batch's protocol snapshot lists (D19): the day-counted
 * ones, plus the phase tasks (D26) of the phase the batch starts in.
 */
export function createTasksFromTemplates(
	db: Db,
	b: Pick<Batch, 'id' | 'startedAt' | 'protocolSnapshotJson' | 'phase'>,
	today: string = localDate()
): Task[] {
	const templates = bodyTasks(b.protocolSnapshotJson?.body).filter(
		(t) => !t.phase || t.phase === b.phase
	);
	if (!templates.length || !b.startedAt) return [];
	const rows = rowsFromTemplates(b.id, templates, localDate(b.startedAt), today);
	return rows.length ? db.insert(task).values(rows).returning().all() : [];
}

/**
 * Runs when a batch moves to another phase (D26): open tasks of the phase it
 * left are removed (done ones stay in the history), and the protocol's tasks
 * for the new phase are created, counted from the day of the move.
 */
export function applyPhaseChange(
	db: Db,
	b: Pick<Batch, 'id' | 'protocolSnapshotJson'>,
	to: string | null,
	at: string = nowIso(),
	today: string = localDate()
): Task[] {
	db.delete(task)
		.where(
			and(
				eq(task.batchId, b.id),
				isNull(task.doneAt),
				isNotNull(task.phase),
				to ? ne(task.phase, to) : undefined
			)
		)
		.run();
	if (!to) return [];
	const templates = bodyTasks(b.protocolSnapshotJson?.body).filter((t) => t.phase === to);
	const rows = rowsFromTemplates(b.id, templates, localDate(at), today);
	return rows.length ? db.insert(task).values(rows).returning().all() : [];
}
