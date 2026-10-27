// Timestamps are stored as ISO 8601 text with the local timezone offset,
// e.g. 2026-10-26T20:15:00-05:00, so a reading taken at 8 pm still says 8 pm
// when read back on the Pi or in an exported CSV.

const pad = (n: number) => String(Math.abs(n)).padStart(2, '0');

function localParts(d: Date) {
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function toIso(d: Date): string {
	const offset = -d.getTimezoneOffset();
	const sign = offset >= 0 ? '+' : '-';
	const zone = `${sign}${pad(Math.trunc(offset / 60))}:${pad(offset % 60)}`;
	return `${localParts(d)}:${pad(d.getSeconds())}${zone}`;
}

export function nowIso(): string {
	return toIso(new Date());
}

/** Value for an `<input type="datetime-local">`, in the server's local time. */
export function toLocalInput(iso: string | null | undefined): string {
	return iso ? localParts(new Date(iso)) : localParts(new Date());
}

/** Reads a `datetime-local` or `date` form value as local time and returns ISO with offset. */
export function fromLocalInput(value: string | null | undefined): string | null {
	if (!value) return null;
	const d = new Date(value.length === 10 ? `${value}T00:00` : value);
	return Number.isNaN(d.getTime()) ? null : toIso(d);
}

/** Whole days from `startIso` to `endIso` (or now). Day 0 is the start day. */
export function dayNumber(startIso: string, endIso?: string | null): number {
	const start = new Date(startIso);
	const end = endIso ? new Date(endIso) : new Date();
	const a = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
	const b = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
	return Math.round((b - a) / 86_400_000);
}

export function formatDate(iso: string | null | undefined): string {
	if (!iso) return '';
	return new Date(iso).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});
}

export function formatDateTime(iso: string | null | undefined): string {
	if (!iso) return '';
	return new Date(iso).toLocaleString('en-US', {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit'
	});
}

// Date-only values (task due dates, D18) are plain local calendar dates such
// as 2026-10-27. Comparing them as strings sorts them by day.

const DATE = /^\d{4}-\d\d-\d\d$/;

function dateParts(date: string): [number, number, number] {
	const [y, m, d] = date.split('-').map(Number);
	return [y, m, d];
}

/** True for a real calendar date written as YYYY-MM-DD. */
export function isDate(value: string | null | undefined): value is string {
	if (!value || !DATE.test(value)) return false;
	const [y, m, d] = dateParts(value);
	const x = new Date(y, m - 1, d);
	return x.getFullYear() === y && x.getMonth() === m - 1 && x.getDate() === d;
}

/** The local calendar date of a moment (default now), e.g. 2026-10-27. */
export function localDate(at: Date | string = new Date()): string {
	const d = typeof at === 'string' ? new Date(DATE.test(at) ? `${at}T00:00` : at) : at;
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(date: string, days: number): string {
	const [y, m, d] = dateParts(date);
	return localDate(new Date(y, m - 1, d + days));
}

/** Calendar months later; a day the month lacks lands on its last day (Jan 31 plus 1 is Feb 28). */
export function addMonths(date: string, months: number): string {
	const [y, m, d] = dateParts(date);
	const lastDay = new Date(y, m - 1 + months + 1, 0).getDate();
	return localDate(new Date(y, m - 1 + months, Math.min(d, lastDay)));
}

/** Whole days from one date to another; negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
	const [y1, m1, d1] = dateParts(from);
	const [y2, m2, d2] = dateParts(to);
	return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

/** "Today", "Tomorrow", "Yesterday", or a short date such as "Tue, Oct 28". */
export function formatDueDate(date: string | null | undefined, today = localDate()): string {
	if (!date) return '';
	const diff = daysBetween(today, date);
	if (diff === 0) return 'Today';
	if (diff === 1) return 'Tomorrow';
	if (diff === -1) return 'Yesterday';
	const [y, m, d] = dateParts(date);
	return new Date(y, m - 1, d).toLocaleDateString('en-US', {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
		...(y === Number(today.slice(0, 4)) ? {} : { year: 'numeric' })
	});
}
