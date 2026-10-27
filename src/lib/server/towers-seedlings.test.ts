import { describe, expect, it } from 'vitest';
import { testDb } from './db/test-helpers';
import { createProtocol } from './protocols';
import { createBatch, getBatchDetail } from './batches';
import { saveCheckIn } from './observations';
import { flushSummary, suggestedYield } from './grows';
import { listOpenTasks } from './tasks';
import { readProtocolForm } from './protocol-form';
import { emptyBody } from '../protocol-body';
import { germination } from '../reading-kinds';

function form(fields: Record<string, string>) {
	const fd = new FormData();
	for (const [k, v] of Object.entries(fields)) fd.set(k, v);
	return fd;
}

describe('tower runs (D35, D36)', () => {
	function tower() {
		const db = testDb();
		const p = createProtocol(db, {
			name: 'Lettuce and basil',
			batchType: 'hydroponic',
			bodyJson: emptyBody()
		});
		const b = createBatch(db, {
			name: 'Tower 001 Lettuce and basil',
			protocolId: p.id,
			startedAt: '2026-09-01T09:00:00-05:00',
			phase: 'vegetative'
		});
		return { db, b };
	}

	it('numbers harvests like flushes and totals them into the yield', () => {
		const { db, b } = tower();
		const cut = (observedAt: string, grams: number, flush?: number) =>
			saveCheckIn(db, {
				batchId: b.id,
				observedAt,
				phase: 'harvest',
				readings: [
					{ kind: 'harvest_weight', value: grams, unit: 'g' },
					{ kind: 'ec', value: 1.6, unit: 'mS/cm' },
					{ kind: 'temp_substrate', value: 68, unit: '°F' }
				],
				flush
			});
		cut('2026-10-01T09:00:00-05:00', 120);
		cut('2026-10-15T09:00:00-05:00', 95);
		const summary = flushSummary(db, b.id);
		expect(summary.flushes.map((f) => [f.flush, f.grams])).toEqual([
			[1, 120],
			[2, 95]
		]);
		expect(suggestedYield(summary)).toEqual({ value: 215, unit: 'g' });
		expect(getBatchDetail(db, b.id)?.batch.phase).toBe('harvest');
	});
});

describe('seedling sowings (D37, D38)', () => {
	it('starts at sown, runs phase tasks, and works out germination', () => {
		const db = testDb();
		const input = readProtocolForm(
			form({
				batchType: 'seedling',
				name: 'Jalapeno',
				// Counts take no target, so these are ignored.
				min_seeds_sown: '10',
				min_temp_substrate: '80',
				max_temp_substrate: '85',
				taskCount: '1',
				task_0_title: 'Bottom water',
				task_0_phase: 'true leaves',
				task_0_start: '0',
				task_0_repeat: 'every',
				task_0_every: '2'
			})
		);
		expect(input.batchType).toBe('seedling');
		expect(input.bodyJson.targets).toEqual([
			{ kind: 'temp_substrate', min: 80, max: 85, unit: '°F' }
		]);
		const p = createProtocol(db, input);
		const b = createBatch(db, {
			name: 'Seedling 001 Jalapeno',
			protocolId: p.id,
			startedAt: '2026-10-01T09:00:00-05:00',
			phase: 'sown'
		});
		expect(listOpenTasks(db, { batchId: b.id })).toEqual([]);

		saveCheckIn(db, {
			batchId: b.id,
			observedAt: '2026-10-01T10:00:00-05:00',
			readings: [{ kind: 'seeds_sown', value: 24, unit: 'seeds' }]
		});
		saveCheckIn(db, {
			batchId: b.id,
			observedAt: '2026-10-12T10:00:00-05:00',
			phase: 'true leaves',
			note: 'First true leaves',
			readings: [{ kind: 'seeds_sprouted', value: 21, unit: 'seeds' }]
		});
		expect(listOpenTasks(db, { batchId: b.id }).map((t) => t.title)).toEqual(['Bottom water']);
		const detail = getBatchDetail(db, b.id)!;
		expect(germination(detail.readings)?.rate).toBe(21 / 24);
	});
});
