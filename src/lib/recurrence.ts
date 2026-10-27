// Repeat patterns for tasks (D17), stored as plain words so the CSV export
// stays readable: "daily", "weekly", or "every N days".

const EVERY = /^every (\d+) days?$/;
const MAX_DAYS = 365;

/** Days between repeats, or null for a one-off task or text that is not a pattern. */
export function recurrenceDays(text: string | null | undefined): number | null {
	const t = text?.trim().toLowerCase();
	if (!t) return null;
	if (t === 'daily') return 1;
	if (t === 'weekly') return 7;
	const m = EVERY.exec(t);
	if (!m) return null;
	const n = Number(m[1]);
	return n >= 1 && n <= MAX_DAYS ? n : null;
}

/** The stored text for an interval, so "every 7 days" is saved as "weekly". */
export function recurrenceFor(days: number): string {
	if (days === 1) return 'daily';
	if (days === 7) return 'weekly';
	return `every ${days} days`;
}

/** "Every day", "Every week", "Every 3 days", or "" for a one-off task. */
export function formatRecurrence(text: string | null | undefined): string {
	const days = recurrenceDays(text);
	if (days === null) return '';
	if (days === 1) return 'Every day';
	if (days === 7) return 'Every week';
	return `Every ${days} days`;
}

/** Turns the repeat picker ("", "daily", "weekly", or "every" plus a day count) into stored text. */
export function recurrenceFromPicker(
	choice: string | null,
	everyDays: number | null
): string | null {
	if (choice === 'daily' || choice === 'weekly') return choice;
	if (choice === 'every') return everyDays === null ? 'every' : `every ${everyDays} days`;
	return null;
}

/** The picker values for stored text, the reverse of `recurrenceFromPicker`. */
export function pickerFor(text: string | null | undefined): {
	choice: string;
	everyDays: number | null;
} {
	const days = recurrenceDays(text);
	if (days === null) return { choice: '', everyDays: null };
	if (days === 1) return { choice: 'daily', everyDays: null };
	if (days === 7) return { choice: 'weekly', everyDays: null };
	return { choice: 'every', everyDays: days };
}

export { MAX_DAYS as MAX_REPEAT_DAYS };
