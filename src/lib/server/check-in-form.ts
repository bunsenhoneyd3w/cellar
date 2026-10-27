import { CONTAMINATION_ACTIONS, CONTAMINATION_KINDS, CONTAMINATION_SEVERITIES } from '../enums';
import { InputError, num, oneOf } from './form';
import type { ContaminationInput } from './observations';

const MAX_ROWS = 10;

/**
 * Reads the c_<n>_kind / _severity / _action rows of the check-in form. A row
 * left untouched is skipped; a row with only some buttons picked is refused,
 * so a half-logged event is never saved as something it is not.
 */
export function readContaminations(fd: FormData): ContaminationInput[] {
	const count = Math.min(num(fd, 'contamCount') ?? 0, MAX_ROWS);
	const rows: ContaminationInput[] = [];
	for (let i = 0; i < count; i++) {
		const kind = oneOf(fd, `c_${i}_kind`, CONTAMINATION_KINDS);
		const severity = oneOf(fd, `c_${i}_severity`, CONTAMINATION_SEVERITIES);
		const action = oneOf(fd, `c_${i}_action`, CONTAMINATION_ACTIONS);
		if (!kind && !severity && !action) continue;
		if (!kind || !severity || !action) {
			throw new InputError('For each contamination, pick what it is, how bad, and what you did.');
		}
		rows.push({ kind, severity, action });
	}
	return rows;
}
