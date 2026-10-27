import { describe, expect, it } from 'vitest';
import { dayNumber, fromLocalInput, toIso, toLocalInput } from './time';

describe('time helpers', () => {
	it('writes ISO 8601 with the local offset', () => {
		expect(toIso(new Date())).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[+-]\d\d:\d\d$/);
	});

	it('round trips a datetime-local form value', () => {
		const iso = fromLocalInput('2026-10-26T20:15');
		expect(iso).toMatch(/^2026-10-26T20:15:00[+-]\d\d:\d\d$/);
		expect(toLocalInput(iso)).toBe('2026-10-26T20:15');
	});

	it('reads a plain date as local midnight and rejects junk', () => {
		expect(fromLocalInput('2026-10-26')).toMatch(/^2026-10-26T00:00:00/);
		expect(fromLocalInput('not a date')).toBeNull();
		expect(fromLocalInput('')).toBeNull();
	});

	it('counts days with the start day as day 0', () => {
		expect(dayNumber('2026-10-20T22:00:00-05:00', '2026-10-20T23:00:00-05:00')).toBe(0);
		expect(dayNumber('2026-10-20T22:00:00-05:00', '2026-10-27T08:00:00-05:00')).toBe(7);
	});
});
