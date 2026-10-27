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
