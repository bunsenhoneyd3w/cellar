import { describe, expect, it } from 'vitest';
import { daysSince, phaseRows, phaseTimeline, sharedTarget } from './compare';

describe('compare rules', () => {
	it('counts days since start with the fraction kept', () => {
		expect(daysSince('2026-10-01T09:00:00-05:00', '2026-10-03T21:00:00-05:00')).toBe(2.5);
		expect(daysSince('2026-10-01T09:00:00-05:00', '2026-10-01T09:00:00-05:00')).toBe(0);
	});

	it('finds the day each phase first shows up on a check-in', () => {
		const t = phaseTimeline(
			[
				{ observedAt: '2026-10-15T09:00:00-05:00', phase: 'fruiting' },
				{ observedAt: '2026-10-03T09:00:00-05:00', phase: 'colonization' },
				{ observedAt: '2026-10-20T09:00:00-05:00', phase: 'fruiting' },
				{ observedAt: '2026-10-05T09:00:00-05:00', phase: null }
			],
			'2026-10-01T08:00:00-05:00'
		);
		expect(t).toEqual({ colonization: 2, fruiting: 14 });
	});

	it('counts the first phase of a fixed list from Day 0', () => {
		const check = [
			{ observedAt: '2026-10-04T09:00:00-05:00', phase: 'germination' },
			{ observedAt: '2026-10-11T09:00:00-05:00', phase: 'seedling' }
		];
		expect(phaseTimeline(check, '2026-10-01T09:00:00-05:00', 'germination')).toEqual({
			germination: 0,
			seedling: 10
		});
	});

	it('orders phase rows by the fixed list, then free text by first day', () => {
		expect(
			phaseRows('mushroom', [
				{ fruiting: 14, colonization: 2 },
				{ colonization: 3, 'cold shock': 12 }
			])
		).toEqual(['colonization', 'fruiting', 'cold shock']);
		expect(
			phaseRows('ferment', [{ 'secondary ferment': 10, 'primary ferment': 0 }, { aging: 30 }])
		).toEqual(['primary ferment', 'secondary ferment', 'aging']);
	});

	it('draws a target band only when every batch aimed at the same range', () => {
		const ec = { kind: 'ec', min: 1.2, max: 2, unit: 'mS/cm' };
		expect(sharedTarget([[ec], [{ ...ec }]], 'ec')).toEqual(ec);
		expect(sharedTarget([[ec], [{ ...ec, max: 2.4 }]], 'ec')).toBeUndefined();
		expect(sharedTarget([[ec], []], 'ec')).toBeUndefined();
		// A phase target is not an all-phases target.
		expect(sharedTarget([[{ ...ec, phase: 'vegetative' }], [ec]], 'ec')).toBeUndefined();
	});
});
