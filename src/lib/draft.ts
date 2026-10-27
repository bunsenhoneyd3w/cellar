// Keeps what is typed on the check-in screen on the phone until it saves, so
// a dropped basement Wi-Fi connection does not lose a note or readings (D52).
// Photos are not kept: they are too big for the phone's page storage.

export type CheckInDraft = { note: string; values: Record<string, string> };
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export const draftKey = (batchId: string) => `cellar-check-in-${batchId}`;

function isEmpty(d: CheckInDraft): boolean {
	return !d.note.trim() && Object.values(d.values).every((v) => v === '' || v == null);
}

/** The saved draft, or null. Storage can be missing or blocked (private mode), so nothing here throws. */
export function readDraft(store: Store | undefined, batchId: string): CheckInDraft | null {
	try {
		const raw = store?.getItem(draftKey(batchId));
		if (!raw) return null;
		const d = JSON.parse(raw) as Partial<CheckInDraft>;
		const draft = {
			note: typeof d.note === 'string' ? d.note : '',
			values: Object.fromEntries(
				Object.entries(d.values ?? {})
					.filter(([, v]) => typeof v === 'string' || typeof v === 'number')
					.map(([k, v]) => [k, String(v)])
			)
		};
		return isEmpty(draft) ? null : draft;
	} catch {
		return null;
	}
}

/** Saves the draft, or removes it once everything is cleared. */
export function writeDraft(store: Store | undefined, batchId: string, draft: CheckInDraft) {
	try {
		if (isEmpty(draft)) store?.removeItem(draftKey(batchId));
		else store?.setItem(draftKey(batchId), JSON.stringify(draft));
	} catch {
		// Full or blocked storage: the form still works, it just is not kept.
	}
}

export function clearDraft(store: Store | undefined, batchId: string) {
	try {
		store?.removeItem(draftKey(batchId));
	} catch {
		// Nothing to do.
	}
}
