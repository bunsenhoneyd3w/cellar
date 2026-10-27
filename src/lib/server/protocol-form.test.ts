import { describe, expect, it } from 'vitest';
import { testDb } from './db/test-helpers';
import { readProtocolForm } from './protocol-form';
import { createProtocol, reviseProtocol } from './protocols';
import { createBatch } from './batches';
import { listOpenTasks } from './tasks';
import {
	SEAL_CHECK_TASK,
	bodyProcessing,
	formatHeadspace,
	targetFor,
	formatTemplate
} from '../protocol-body';

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

	it('reads a mushroom tek with phase targets and phase tasks', () => {
		// Phase index 1 is colonization, 3 is fruiting (D27 order).
		const input = readProtocolForm(
			form({
				batchType: 'mushroom',
				name: 'Blue Oyster',
				min_temp_air: '55',
				max_temp_air: '80',
				min_temp_air_p1: '70',
				max_temp_air_p1: '75',
				min_rh_p3: '85',
				max_rh_p3: '95',
				max_co2_p3: '1000',
				min_harvest_weight: '5',
				taskCount: '2',
				task_0_title: 'Mist and fan',
				task_0_phase: 'fruiting',
				task_0_start: '0',
				task_0_repeat: 'daily',
				task_0_end: '40',
				task_1_title: 'Check colonization',
				task_1_start: '7',
				task_1_repeat: 'every',
				task_1_every: '3',
				task_1_end: '21'
			})
		);
		expect(input.batchType).toBe('mushroom');
		expect(input.bodyJson.targets).toEqual([
			{ kind: 'temp_air', min: 55, max: 80, unit: '°F' },
			{ kind: 'temp_air', min: 70, max: 75, unit: '°F', phase: 'colonization' },
			{ kind: 'rh', min: 85, max: 95, unit: '%', phase: 'fruiting' },
			{ kind: 'co2', min: null, max: 1000, unit: 'ppm', phase: 'fruiting' }
		]);
		expect(input.bodyJson.tasks).toEqual([
			{ title: 'Mist and fan', startDay: 0, recurrence: 'daily', endDay: null, phase: 'fruiting' },
			{ title: 'Check colonization', startDay: 7, recurrence: 'every 3 days', endDay: 21 }
		]);

		const targets = input.bodyJson.targets;
		expect(targetFor(targets, 'temp_air', 'colonization')?.min).toBe(70);
		expect(targetFor(targets, 'temp_air', 'fruiting')?.min).toBe(55);
		expect(targetFor(targets, 'rh', 'spawn')).toBeUndefined();
		expect(formatTemplate(input.bodyJson.tasks![0])).toBe('During fruiting, every day');

		const db = testDb();
		expect(createProtocol(db, input).batchType).toBe('mushroom');
	});

	it('ignores phase fields on a ferment protocol', () => {
		const input = readProtocolForm(
			form({
				name: 'Kraut',
				min_ph_p1: '3',
				taskCount: '1',
				task_0_title: 'Taste',
				task_0_phase: 'fruiting'
			})
		);
		expect(input.batchType).toBe('ferment');
		expect(input.bodyJson.targets).toEqual([]);
		expect(input.bodyJson.tasks?.[0].phase).toBeUndefined();
	});

	it('keeps the type of the protocol being edited', () => {
		const input = readProtocolForm(
			form({ name: 'x', batchType: 'ferment' }),
			undefined,
			'mushroom'
		);
		expect(input.batchType).toBe('mushroom');
	});

	it('rejects a phase that is not on the list', () => {
		const db = testDb();
		const base = readProtocolForm(form({ batchType: 'mushroom', name: 'Lions mane' }));
		expect(() =>
			createProtocol(db, {
				...base,
				bodyJson: {
					...base.bodyJson,
					tasks: [
						{ title: 'Mist', startDay: 0, recurrence: 'daily', endDay: null, phase: 'Fruiting' }
					]
				}
			})
		).toThrow(/no Fruiting phase/);
		expect(() =>
			createProtocol(db, {
				...base,
				bodyJson: {
					...base.bodyJson,
					targets: [{ kind: 'rh', min: 90, max: 80, unit: '%', phase: 'fruiting' }]
				}
			})
		).toThrow(/for fruiting has a minimum above/);
	});
});

describe('preserve protocols (D28, D30, D33)', () => {
	const salsa = {
		batchType: 'preserve',
		name: 'Salsa',
		method: 'water_bath',
		headspaceIn: '0.5',
		jarCount: '3',
		jar_0_size: 'pint',
		jar_0_minutes: '20',
		jar_0_psi: '10',
		jar_1_size: '',
		jar_1_minutes: '',
		jar_2_size: 'half pint',
		jar_2_minutes: '15',
		shelfLifeMonths: '18'
	};

	it('reads the method, headspace, jar times, and shelf life', () => {
		const input = readProtocolForm(form(salsa));
		expect(input.batchType).toBe('preserve');
		expect(input.bodyJson.processing).toEqual({
			method: 'water_bath',
			headspaceIn: 0.5,
			// Psi is dropped for a water bath; the empty middle row is skipped.
			jars: [
				{ size: 'pint', minutes: 20, psi: null },
				{ size: 'half pint', minutes: 15, psi: null }
			]
		});
		expect(input.bodyJson.shelfLifeMonths).toBe(18);
		expect(createProtocol(testDb(), input).bodyJson.processing?.jars).toHaveLength(2);
	});

	it('keeps psi for a pressure canner', () => {
		const input = readProtocolForm(
			form({
				batchType: 'preserve',
				name: 'Green beans',
				method: 'pressure',
				jarCount: '1',
				jar_0_size: 'quart',
				jar_0_minutes: '25',
				jar_0_psi: '15'
			})
		);
		expect(input.bodyJson.processing?.jars).toEqual([{ size: 'quart', minutes: 25, psi: 15 }]);
	});

	it('rejects a time with no jar size, and a shelf life out of range', () => {
		const db = testDb();
		expect(() =>
			createProtocol(db, readProtocolForm(form({ ...salsa, jar_1_minutes: '30' })))
		).toThrow(/needs a jar size/);
		expect(() =>
			createProtocol(db, readProtocolForm(form({ ...salsa, shelfLifeMonths: '1.5' })))
		).toThrow(/Shelf life/);
		expect(() =>
			createProtocol(db, readProtocolForm(form({ ...salsa, jar_0_minutes: '-5' })))
		).toThrow(/minutes/);
	});

	it('leaves processing off ferment and mushroom protocols, old and new', () => {
		const kraut = readProtocolForm(form({ ...salsa, batchType: 'ferment', name: 'Kraut' }));
		expect(kraut.bodyJson.processing).toBeUndefined();
		expect(kraut.bodyJson.shelfLifeMonths).toBeUndefined();
		const db = testDb();
		const saved = createProtocol(db, kraut);
		expect('processing' in saved.bodyJson).toBe(false);
		expect(bodyProcessing(saved.bodyJson)).toBeUndefined();
		// Saving the same ferment again makes no new version.
		expect(reviseProtocol(db, saved.id, kraut).version).toBe(1);
	});

	it('starts a batch with the processing in its snapshot and the seal check task', () => {
		const db = testDb();
		const body = readProtocolForm(form(salsa)).bodyJson;
		const p = createProtocol(db, {
			...readProtocolForm(form(salsa)),
			bodyJson: { ...body, tasks: [SEAL_CHECK_TASK] }
		});
		const b = createBatch(db, {
			name: 'Preserve 001 Salsa',
			protocolId: p.id,
			startedAt: '2026-10-27T09:00:00-05:00',
			phase: 'prep'
		});
		expect(b.batchType).toBe('preserve');
		expect(b.protocolSnapshotJson?.body.processing?.method).toBe('water_bath');
		const tasks = listOpenTasks(db, { batchId: b.id });
		expect(tasks.map((t) => [t.title, t.dueAt])).toEqual([
			['Check seals, remove rings, label', '2026-10-28']
		]);
	});

	it('writes headspace as a fraction', () => {
		expect(formatHeadspace(0.5)).toBe('1/2 in');
		expect(formatHeadspace(0.25)).toBe('1/4 in');
		expect(formatHeadspace(1)).toBe('1 in');
		expect(formatHeadspace(1.25)).toBe('1 1/4 in');
		expect(formatHeadspace(0.3)).toBe('0.3 in');
		expect(formatHeadspace(null)).toBe('');
	});
});
