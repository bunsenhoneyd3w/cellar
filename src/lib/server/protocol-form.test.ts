import { describe, expect, it } from 'vitest';
import { testDb } from './db/test-helpers';
import { readProtocolForm } from './protocol-form';
import { createProtocol, reviseProtocol } from './protocols';

function form(fields: Record<string, string>) {
	const fd = new FormData();
	for (const [k, v] of Object.entries(fields)) fd.set(k, v);
	return fd;
}

describe('protocol form', () => {
	it('reads task rows and skips rows with no name', () => {
		const input = readProtocolForm(
			form({
				name: 'Kraut',
				taskCount: '3',
				task_0_title: 'Top up airlock water',
				task_0_start: '1',
				task_0_repeat: 'every',
				task_0_every: '7',
				task_0_end: '28',
				task_1_title: '',
				task_2_title: 'Taste',
				task_2_start: '7',
				task_2_repeat: '',
				task_2_end: '9'
			})
		);
		expect(input.bodyJson.tasks).toEqual([
			{ title: 'Top up airlock water', startDay: 1, recurrence: 'weekly', endDay: 28 },
			{ title: 'Taste', startDay: 7, recurrence: null, endDay: null }
		]);
	});

	it('saving an old protocol with no tasks does not make a new version', () => {
		const db = testDb();
		// Saved before task lists existed: the body has no tasks key at all.
		const p = createProtocol(db, readProtocolForm(form({ name: 'Kraut' })));
		expect('tasks' in p.bodyJson).toBe(false);
		const input = readProtocolForm(form({ name: 'Kraut', taskCount: '0' }), p.bodyJson);
		expect(input.bodyJson.tasks).toBeUndefined();
		expect(reviseProtocol(db, p.id, input).version).toBe(1);
	});
});
