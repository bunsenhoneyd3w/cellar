import { describe, expect, it } from 'vitest';
import {
	formatGermination,
	germination,
	kindLabel,
	kindsFor,
	targetKindsFor,
	trackedKindsFor
} from './reading-kinds';
import { STARTABLE_TYPES, fixedPhases, harvestWord, hasHarvests } from './enums';
import { bodyWords } from './protocol-body';

const kinds = (list: { kind: string }[]) => list.map((k) => k.kind);

describe('tower and seedling reading kinds', () => {
	it('offers the tower its tank readings, water temp, and harvests (D36)', () => {
		expect(kinds(kindsFor('hydroponic')).sort()).toEqual(
			[
				'ec',
				'harvest_weight',
				'height',
				'light_hours',
				'ph',
				'temp_air',
				'temp_substrate',
				'water_level'
			].sort()
		);
		expect(kinds(trackedKindsFor('hydroponic'))).not.toContain('harvest_weight');
		expect(kindLabel('temp_substrate', 'hydroponic')).toBe('Water temp');
	});

	it('offers seedlings soil temp and seed counts, with no targets on counts (D37)', () => {
		expect(kinds(kindsFor('seedling')).sort()).toEqual(
			[
				'height',
				'light_hours',
				'rh',
				'seeds_sown',
				'seeds_sprouted',
				'temp_air',
				'temp_substrate'
			].sort()
		);
		expect(kinds(trackedKindsFor('seedling'))).toContain('seeds_sown');
		expect(kinds(targetKindsFor('seedling'))).not.toContain('seeds_sown');
		expect(kinds(targetKindsFor('seedling'))).not.toContain('seeds_sprouted');
		expect(kindLabel('temp_substrate', 'seedling')).toBe('Soil temp');
	});

	it('leaves ferment and grow lists as they were', () => {
		expect(kinds(targetKindsFor('ferment'))).toEqual(kinds(trackedKindsFor('ferment')));
		expect(kindLabel('temp_substrate', 'mushroom')).toBe('Substrate temp');
		expect(kindLabel('temp_substrate', 'ferment')).toBe('Brine or mash temp');
	});
});

describe('germination', () => {
	const r = (kind: string, value: number, takenAt: string) => ({ kind, value, takenAt });

	it('is the latest sprouted count over the latest sown count', () => {
		const g = germination([
			r('seeds_sown', 24, '2026-10-01T09:00:00-05:00'),
			r('seeds_sprouted', 6, '2026-10-06T09:00:00-05:00'),
			r('seeds_sprouted', 18, '2026-10-09T09:00:00-05:00'),
			r('temp_air', 72, '2026-10-09T09:00:00-05:00')
		]);
		expect(g).toEqual({ sown: 24, sprouted: 18, rate: 0.75 });
		expect(formatGermination(g!)).toBe('18 of 24 sprouted (75%)');
	});

	it('is null until both counts are logged', () => {
		expect(germination([])).toBeNull();
		expect(germination([r('seeds_sown', 24, '2026-10-01T09:00:00-05:00')])).toBeNull();
		expect(germination([r('seeds_sown', 0, '2026-10-01T09:00:00-05:00')])).toBeNull();
	});
});

describe('batch type lists', () => {
	it('lets every type be started, each with phase buttons but ferments (D38)', () => {
		expect([...STARTABLE_TYPES].sort()).toEqual(
			['ferment', 'hydroponic', 'mushroom', 'preserve', 'seedling'].sort()
		);
		expect(fixedPhases('hydroponic')?.[0]).toBe('germination');
		expect(fixedPhases('seedling')).toContain('true leaves');
		expect(fixedPhases('ferment')).toBeUndefined();
	});

	it('calls a harvest number a flush on a grow and a harvest on a tower', () => {
		expect(hasHarvests('mushroom')).toBe(true);
		expect(hasHarvests('hydroponic')).toBe(true);
		expect(hasHarvests('seedling')).toBe(false);
		expect(harvestWord('mushroom', 2)).toBe('flushes');
		expect(harvestWord('hydroponic')).toBe('harvest');
	});

	it('names protocol parts by type', () => {
		expect(bodyWords('mushroom').steps).toBe('Tek steps');
		expect(bodyWords('seedling').ingredients).toBe('Seeds and supplies');
		expect(bodyWords('ferment').servings).toBe(true);
		expect(bodyWords('hydroponic').servings).toBe(false);
	});
});
