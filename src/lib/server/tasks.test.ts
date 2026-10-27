import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { openDb, schema } from './db';
import { migrateToLatest, migrationsUpTo, testDb } from './db/test-helpers';
import { createProtocol } from './protocols';
import { createBatch } from './batches';
import { finishBatch, reopenBatch } from './outcomes';
import {
	completeTask,
	createTask,
	createTasksFromTemplates,
	deleteTask,
	getTask,
	listOpenTasks,
	todayTasks,
	undoTask,
	updateTask
} from './tasks';
import { emptyBody, type TaskTemplate } from '../protocol-body';
import { recurrenceDays, recurrenceFor, formatRecurrence } from '../recurrence';
import { addDays, localDate, toIso } from '../time';

const today = localDate();

function setup(tasks?: TaskTemplate[], startedAt?: string) {
	const db = testDb();
	const p = createProtocol(db, {
		name: 'Kraut',
		batchType: 'ferment',
		bodyJson: { ...emptyBody(), tasks }
	});
	const b = createBatch(db, { name: 'Ferment 001 Kraut', protocolId: p.id, startedAt });
	return { db, p, b };
}

/** A local timestamp at noon on a date, so tests never straddle midnight. */
const noon = (date: string) => toIso(new Date(`${date}T12:00`));

describe('recurrence', () => {
	it('reads daily, weekly, and every N days', () => {
		expect(recurrenceDays('daily')).toBe(1);
		expect(recurrenceDays('weekly')).toBe(7);
		expect(recurrenceDays('every 3 days')).toBe(3);
		expect(recurrenceDays('Every 1 day')).toBe(1);
		expect(recurrenceDays('')).toBeNull();
		expect(recurrenceDays('every 0 days')).toBeNull();
		expect(recurrenceDays('every 400 days')).toBeNull();
		expect(recurrenceDays('mondays')).toBeNull();
	});

	it('stores intervals in their plainest wording', () => {
		expect(recurrenceFor(1)).toBe('daily');
		expect(recurrenceFor(7)).toBe('weekly');
		expect(recurrenceFor(14)).toBe('every 14 days');
		expect(formatRecurrence('every 3 days')).toBe('Every 3 days');
		expect(formatRecurrence(null)).toBe('');
	});
});

describe('tasks', () => {
	it('creates general and batch tasks and checks the input', () => {
		const { db, b } = setup();
		const general = createTask(db, { title: ' Buy airlocks ' });
		expect(general).toMatchObject({ title: 'Buy airlocks', batchId: null, dueAt: null });
		expect(general.id).toMatch(/^tsk_/);

		const t = createTask(db, {
			title: 'Top up airlock water',
			batchId: b.id,
			dueAt: today,
			recurrence: 'every 7 days',
			repeatUntil: addDays(today, 28)
		});
		expect(t.recurrence).toBe('weekly');

		expect(() => createTask(db, { title: '' })).toThrow(/name/);
		expect(() => createTask(db, { title: 'x', dueAt: '2026-02-30' })).toThrow(/real date/);
		expect(() => createTask(db, { title: 'x', recurrence: 'daily' })).toThrow(/first due date/);
		expect(() => createTask(db, { title: 'x', dueAt: today, recurrence: 'often' })).toThrow(
			/1 to 365/
		);
		expect(() =>
			createTask(db, {
				title: 'x',
				dueAt: today,
				recurrence: 'daily',
				repeatUntil: addDays(today, -1)
			})
		).toThrow(/stops before/);
		expect(() => createTask(db, { title: 'x', batchId: 'bat_missing000' })).toThrow(/no longer/);
	});

	it('drops the stop date when a task does not repeat', () => {
		const { db } = setup();
		const t = createTask(db, { title: 'Taste', dueAt: today, repeatUntil: addDays(today, 3) });
		expect(t.repeatUntil).toBeNull();
		const edited = updateTask(db, t.id, { title: 'Taste it', dueAt: addDays(today, 1) });
		expect(edited).toMatchObject({ title: 'Taste it', dueAt: addDays(today, 1) });
	});

	it('finishing a one-off task makes nothing new', () => {
		const { db } = setup();
		const t = createTask(db, { title: 'Taste', dueAt: today });
		const { task, next } = completeTask(db, t.id, noon(today));
		expect(task.doneAt).toBe(noon(today));
		expect(next).toBeUndefined();
		expect(listOpenTasks(db)).toHaveLength(0);
	});

	it('finishing a repeating task makes the next one, counted from the day it was done', () => {
		const { db } = setup();
		const due = addDays(today, -3);
		const t = createTask(db, { title: 'Check kahm', dueAt: due, recurrence: 'weekly' });

		// Done three days late: the next one is a week from today, not a week from the old due date.
		const { next } = completeTask(db, t.id, noon(today));
		expect(next).toMatchObject({
			title: 'Check kahm',
			dueAt: addDays(today, 7),
			recurrence: 'weekly',
			previousTaskId: t.id,
			doneAt: null
		});
		expect(listOpenTasks(db).map((o) => o.id)).toEqual([next!.id]);

		// Tapping Done twice does not make a second copy.
		completeTask(db, t.id);
		expect(listOpenTasks(db)).toHaveLength(1);
	});

	it('stops repeating after the stop date', () => {
		const { db } = setup();
		const t = createTask(db, {
			title: 'Burp',
			dueAt: today,
			recurrence: 'daily',
			repeatUntil: addDays(today, 1)
		});
		const first = completeTask(db, t.id, noon(today));
		expect(first.next?.dueAt).toBe(addDays(today, 1));
		const second = completeTask(db, first.next!.id, noon(addDays(today, 1)));
		expect(second.next).toBeUndefined();
	});

	it('undo takes back Done and removes the copy it made', () => {
		const { db } = setup();
		const t = createTask(db, { title: 'Check kahm', dueAt: today, recurrence: 'daily' });
		const { next } = completeTask(db, t.id, noon(today));
		const back = undoTask(db, t.id);
		expect(back.doneAt).toBeNull();
		expect(getTask(db, next!.id)).toBeUndefined();
		expect(listOpenTasks(db).map((o) => o.id)).toEqual([t.id]);
	});

	it('will not undo once the next repeat is done too', () => {
		const { db } = setup();
		const t = createTask(db, { title: 'Check kahm', dueAt: today, recurrence: 'daily' });
		const { next } = completeTask(db, t.id, noon(today));
		completeTask(db, next!.id, noon(addDays(today, 1)));
		expect(() => undoTask(db, t.id)).toThrow(/already done/);
	});

	it('deleting a done task keeps the repeat it made', () => {
		const { db } = setup();
		const t = createTask(db, { title: 'Check kahm', dueAt: today, recurrence: 'daily' });
		const { next } = completeTask(db, t.id, noon(today));
		deleteTask(db, t.id);
		expect(getTask(db, next!.id)?.previousTaskId).toBeNull();
	});

	it('hides tasks of finished batches and brings them back on reopen', () => {
		const { db, b } = setup();
		createTask(db, { title: 'Top up airlock', batchId: b.id, dueAt: today });
		createTask(db, { title: 'Buy salt', dueAt: today });
		finishBatch(db, b.id, { status: 'done' });
		expect(listOpenTasks(db).map((t) => t.title)).toEqual(['Buy salt']);
		reopenBatch(db, b.id);
		expect(listOpenTasks(db)).toHaveLength(2);
		expect(listOpenTasks(db, { batchId: b.id })[0]).toMatchObject({
			title: 'Top up airlock',
			batchName: 'Ferment 001 Kraut'
		});
	});

	it('groups open tasks for the Today screen', () => {
		const { db } = setup();
		createTask(db, { title: 'Late', dueAt: addDays(today, -2) });
		createTask(db, { title: 'Now', dueAt: today });
		createTask(db, { title: 'Soon', dueAt: addDays(today, 3) });
		createTask(db, { title: 'Far', dueAt: addDays(today, 30) });
		createTask(db, { title: 'Whenever' });

		const g = todayTasks(db, today);
		expect(g.overdue.map((t) => t.title)).toEqual(['Late']);
		expect(g.today.map((t) => t.title)).toEqual(['Now']);
		expect(g.upcoming.map((t) => t.title)).toEqual(['Soon']);
		expect(g.undated.map((t) => t.title)).toEqual(['Whenever']);
		expect(listOpenTasks(db, { dueThrough: today }).map((t) => t.title)).toEqual(['Late', 'Now']);
	});
});

describe('protocol task lists', () => {
	const airlock: TaskTemplate = {
		title: 'Top up airlock water',
		startDay: 1,
		recurrence: 'weekly',
		endDay: 28
	};
	const taste: TaskTemplate = { title: 'Taste', startDay: 7, recurrence: null, endDay: null };

	it('creates the listed tasks when a batch starts', () => {
		const { db, b } = setup([airlock, taste], noon(today));
		const tasks = listOpenTasks(db, { batchId: b.id });
		expect(tasks).toHaveLength(2);
		expect(tasks[0]).toMatchObject({
			title: 'Top up airlock water',
			dueAt: addDays(today, 1),
			recurrence: 'weekly',
			repeatUntil: addDays(today, 28)
		});
		expect(tasks[1]).toMatchObject({ title: 'Taste', dueAt: addDays(today, 7), recurrence: null });
	});

	it('catches up a batch entered after it started', () => {
		const start = addDays(today, -10);
		const { db, b } = setup([airlock, taste], noon(start));
		const tasks = listOpenTasks(db, { batchId: b.id });
		// Day 1 was nine days ago; weekly repeats land on days 8 and 15, so the next is day 15.
		expect(tasks.map((t) => [t.title, t.dueAt])).toEqual([
			['Top up airlock water', addDays(start, 15)]
		]);
	});

	it('skips a repeat whose stop day has already passed', () => {
		const start = addDays(today, -40);
		const { db, b } = setup([airlock], noon(start));
		expect(listOpenTasks(db, { batchId: b.id })).toHaveLength(0);
	});

	it('creates tasks ahead of time for a planned batch', () => {
		const start = addDays(today, 5);
		const { db, b } = setup([taste], noon(start));
		expect(b.status).toBe('planned');
		expect(listOpenTasks(db, { batchId: b.id })[0].dueAt).toBe(addDays(start, 7));
	});

	it('treats protocols and batches from before task lists as having none', () => {
		const { db, b } = setup(undefined);
		expect(b.protocolSnapshotJson?.body.tasks).toBeUndefined();
		expect(createTasksFromTemplates(db, b)).toEqual([]);
		expect(listOpenTasks(db)).toHaveLength(0);
	});

	it('rejects a task list with mistakes', () => {
		const db = testDb();
		const make = (t: TaskTemplate) =>
			createProtocol(db, {
				name: 'P',
				batchType: 'ferment',
				bodyJson: { ...emptyBody(), tasks: [t] }
			});
		expect(() => make({ ...taste, title: ' ' })).toThrow(/needs a name/);
		expect(() => make({ ...taste, startDay: -1 })).toThrow(/first day/);
		expect(() => make({ ...airlock, recurrence: 'often' })).toThrow(/1 to 365/);
		expect(() => make({ ...airlock, endDay: 0 })).toThrow(/last day/);
	});
});

// CLAUDE.md rule 7: a task written by the first schema still reads after the
// Phase 2 migration. The SQL below matches the baseline table and must not be edited.
describe('task migration safety', () => {
	it('keeps a task written by the first schema', () => {
		const db = openDb(':memory:', migrationsUpTo(1));
		const t = '2026-10-26T20:00:00-05:00';
		db.$client.exec(`
			insert into task (id, batch_id, title, due_at, done_at, recurrence, created_at, updated_at)
				values ('tsk_aaaaaaaaaa', null, 'Check airlock', '2026-10-27', null, 'weekly', '${t}', '${t}');
		`);
		migrateToLatest(db);
		const row = db.select().from(schema.task).where(eq(schema.task.id, 'tsk_aaaaaaaaaa')).get();
		expect(row).toMatchObject({
			title: 'Check airlock',
			dueAt: '2026-10-27',
			recurrence: 'weekly',
			repeatUntil: null,
			previousTaskId: null
		});
		const { next } = completeTask(db, 'tsk_aaaaaaaaaa', '2026-10-27T09:00:00-05:00');
		expect(next?.dueAt).toBe('2026-11-03');
	});
});
