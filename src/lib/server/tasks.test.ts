import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { openDb, schema } from './db';
import { migrateToLatest, migrationsUpTo, testDb } from './db/test-helpers';
import { createProtocol } from './protocols';
import { createBatch, updateBatch } from './batches';
import { createObservation, saveCheckIn } from './observations';
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
			previousTaskId: null,
			phase: null
		});
		const { next } = completeTask(db, 'tsk_aaaaaaaaaa', '2026-10-27T09:00:00-05:00');
		expect(next?.dueAt).toBe('2026-11-03');
	});

	// Phase 3 adds task.phase (migration 4). A repeating batch task written the
	// way Phase 2 left it must still show, repeat, and stop on its date.
	it('keeps a Phase 2 repeating batch task working after the Phase 3 migrations', () => {
		const db = openDb(':memory:', migrationsUpTo(2));
		const t = '2026-10-26T20:00:00-05:00';
		db.$client.exec(`
			insert into protocol (id, family_id, name, batch_type, version, body_json, created_at, updated_at)
				values ('pro_cccccccccc', 'prf_cccccccccc', 'Kraut', 'ferment', 1, '{"ingredients":[],"steps":[],"targets":[],"expectedDays":21}', '${t}', '${t}');
			insert into batch (id, name, batch_type, protocol_id, started_at, status, phase, created_at, updated_at)
				values ('bat_cccccccccc', 'Ferment 003 Kraut', 'ferment', 'pro_cccccccccc', '${t}', 'active', 'primary ferment', '${t}', '${t}');
			insert into task (id, batch_id, title, due_at, recurrence, repeat_until, created_at, updated_at)
				values ('tsk_cccccccccc', 'bat_cccccccccc', 'Top up airlock water', '2026-10-27', 'weekly', '2026-11-04', '${t}', '${t}');
		`);
		migrateToLatest(db);
		expect(listOpenTasks(db, { batchId: 'bat_cccccccccc' }).map((x) => x.id)).toEqual([
			'tsk_cccccccccc'
		]);
		const { next } = completeTask(db, 'tsk_cccccccccc', '2026-10-27T09:00:00-05:00');
		expect(next).toMatchObject({ dueAt: '2026-11-03', phase: null });
		expect(completeTask(db, next!.id, '2026-11-03T09:00:00-05:00').next).toBeUndefined();
	});
});

describe('phase tasks', () => {
	const mist: TaskTemplate = {
		title: 'Mist and fan',
		startDay: 0,
		recurrence: 'daily',
		endDay: null,
		phase: 'fruiting'
	};
	const check: TaskTemplate = {
		title: 'Check for green',
		startDay: 3,
		recurrence: 'every 3 days',
		endDay: null,
		phase: 'colonization'
	};

	function grow(startPhase = 'spawn') {
		const db = testDb();
		const p = createProtocol(db, {
			name: 'Blue Oyster',
			batchType: 'mushroom',
			bodyJson: { ...emptyBody(), tasks: [mist, check] }
		});
		const b = createBatch(db, {
			name: 'Grow 001 Blue Oyster',
			protocolId: p.id,
			phase: startPhase
		});
		return { db, b };
	}
	const titles = (db: ReturnType<typeof testDb>, batchId: string) =>
		listOpenTasks(db, { batchId }).map((x) => `${x.title} ${x.dueAt}`);

	it('waits for its phase, then follows the batch in and out of it', () => {
		const { db, b } = grow();
		expect(titles(db, b.id)).toEqual([]);

		createObservation(db, { batchId: b.id, note: 'Into the tub', phase: 'colonization' });
		expect(titles(db, b.id)).toEqual([`Check for green ${addDays(today, 3)}`]);

		createObservation(db, { batchId: b.id, note: 'Fully white', phase: 'fruiting' });
		expect(titles(db, b.id)).toEqual([`Mist and fan ${today}`]);
		const open = listOpenTasks(db, { batchId: b.id })[0];
		expect(open.phase).toBe('fruiting');

		// Done carries the phase to the next copy.
		const { next } = completeTask(db, open.id);
		expect(next).toMatchObject({ phase: 'fruiting', dueAt: addDays(today, 1) });

		// Leaving fruiting removes the open copy and keeps the done one.
		createObservation(db, { batchId: b.id, note: 'Picked', phase: 'harvest' });
		expect(titles(db, b.id)).toEqual([]);
		expect(getTask(db, open.id)?.doneAt).not.toBeNull();
		expect(getTask(db, next!.id)).toBeUndefined();

		// Back to fruiting for flush 2: the task comes back on its own.
		createObservation(db, { batchId: b.id, note: 'Soaked, back in the tent', phase: 'fruiting' });
		expect(titles(db, b.id)).toEqual([`Mist and fan ${today}`]);

		// Undo of the old Done still works; the task stays hidden outside its phase.
		createObservation(db, { batchId: b.id, note: 'Done', phase: 'cleanup' });
		expect(undoTask(db, open.id).doneAt).toBeNull();
		expect(titles(db, b.id)).toEqual([]);
	});

	it('creates tasks for the phase a batch starts in', () => {
		const { db, b } = grow('fruiting');
		expect(titles(db, b.id)).toEqual([`Mist and fan ${today}`]);
	});

	it('ticking a task on the check-in that leaves its phase leaves no copy behind', () => {
		const { db, b } = grow('fruiting');
		const [t] = listOpenTasks(db, { batchId: b.id });
		saveCheckIn(db, { batchId: b.id, note: 'Harvest day', phase: 'harvest', taskIds: [t.id] });
		expect(getTask(db, t.id)?.doneAt).not.toBeNull();
		expect(titles(db, b.id)).toEqual([]);
	});

	it('follows a phase changed on the edit screen too', () => {
		const { db, b } = grow();
		updateBatch(db, b.id, { name: b.name, startedAt: b.startedAt, phase: 'fruiting' });
		expect(titles(db, b.id)).toEqual([`Mist and fan ${today}`]);
		updateBatch(db, b.id, { name: b.name, startedAt: b.startedAt, phase: 'cleanup' });
		expect(titles(db, b.id)).toEqual([]);
	});

	it('starts a backdated phase change on its first repeat from today', () => {
		const { db, b } = grow();
		createObservation(db, {
			batchId: b.id,
			note: 'Into the tub',
			phase: 'colonization',
			observedAt: noon(addDays(today, -5))
		});
		// Day 3 of colonization was two days ago; every 3 days lands tomorrow.
		expect(titles(db, b.id)).toEqual([`Check for green ${addDays(today, 1)}`]);
	});
});
