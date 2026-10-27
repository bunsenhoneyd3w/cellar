import { describe, expect, it } from 'vitest';
import { readContaminations } from './check-in-form';

function form(fields: Record<string, string>) {
	const fd = new FormData();
	for (const [k, v] of Object.entries(fields)) fd.set(k, v);
	return fd;
}

describe('check-in form', () => {
	it('reads contamination rows and skips untouched ones', () => {
		expect(
			readContaminations(
				form({
					contamCount: '2',
					c_0_kind: 'trich',
					c_0_severity: 'spot',
					c_0_action: 'watching'
				})
			)
		).toEqual([{ kind: 'trich', severity: 'spot', action: 'watching' }]);
		expect(readContaminations(form({}))).toEqual([]);
	});

	it('refuses a half-picked row', () => {
		expect(() =>
			readContaminations(form({ contamCount: '1', c_0_kind: 'cobweb', c_0_action: 'tossed' }))
		).toThrow(/how bad/);
	});
});
