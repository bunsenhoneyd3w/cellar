import { describe, expect, it } from 'vitest';
import {
	addDays,
	dayNumber,
	daysBetween,
	formatDueDate,
	fromLocalInput,
	isDate,
	localDate,
	toIso,
	toLocalInput
} from './time';

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

	it('handles plain dates across month and year ends', () => {
		expect(addDays('2026-10-30', 3)).toBe('2026-11-02');
		expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
		expect(addDays('2026-03-07', 1)).toBe('2026-03-08');
		expect(daysBetween('2026-10-27', '2026-11-03')).toBe(7);
		expect(daysBetween('2026-11-03', '2026-10-27')).toBe(-7);
		expect(localDate('2026-10-27T23:30:00-05:00')).toBe(
			localDate(new Date('2026-10-27T23:30:00-05:00'))
		);
		expect(localDate('2026-10-27')).toBe('2026-10-27');
	});

	it('accepts only real dates', () => {
		expect(isDate('2026-10-27')).toBe(true);
		expect(isDate('2026-02-30')).toBe(false);
		expect(isDate('10/27/2026')).toBe(false);
		expect(isDate(null)).toBe(false);
	});

	it('labels due dates relative to today', () => {
		expect(formatDueDate('2026-10-27', '2026-10-27')).toBe('Today');
		expect(formatDueDate('2026-10-28', '2026-10-27')).toBe('Tomorrow');
		expect(formatDueDate('2026-10-26', '2026-10-27')).toBe('Yesterday');
		expect(formatDueDate('2026-10-30', '2026-10-27')).toBe('Fri, Oct 30');
		expect(formatDueDate('2027-01-05', '2026-10-27')).toBe('Tue, Jan 5, 2027');
	});
});
