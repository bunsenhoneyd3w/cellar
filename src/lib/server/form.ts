// Small helpers for reading form posts. Empty fields become null so the
// database never stores blank strings.

export function str(fd: FormData, key: string): string | null {
	const v = fd.get(key);
	if (typeof v !== 'string') return null;
	const t = v.trim();
	return t === '' ? null : t;
}

export function num(fd: FormData, key: string): number | null {
	const v = str(fd, key);
	if (v === null) return null;
	const n = Number(v);
	return Number.isFinite(n) ? n : null;
}

export function oneOf<T extends string>(
	fd: FormData,
	key: string,
	allowed: readonly T[]
): T | null {
	const v = str(fd, key);
	return v !== null && (allowed as readonly string[]).includes(v) ? (v as T) : null;
}

/** Splits a textarea into trimmed, non-empty lines. */
export function lines(text: string | null): string[] {
	return (text ?? '')
		.split(/\r?\n/)
		.map((l) => l.trim())
		.filter(Boolean);
}

/** Thrown by data functions for problems the person can fix; shown on the form. */
export class InputError extends Error {}
