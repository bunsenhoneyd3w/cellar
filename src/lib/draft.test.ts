import { describe, expect, it } from 'vitest';
import { clearDraft, draftKey, readDraft, writeDraft } from './draft';

function memory() {
	const m = new Map<string, string>();
	return {
		getItem: (k: string) => m.get(k) ?? null,
		setItem: (k: string, v: string) => void m.set(k, v),
		removeItem: (k: string) => void m.delete(k),
		m
	};
}

describe('check-in drafts', () => {
	it('keeps typing per batch and clears it after a save', () => {
		const s = memory();
		writeDraft(s, 'bat_a', { note: 'Smells sour', values: { ph: '3.6' } });
		writeDraft(s, 'bat_b', { note: '', values: { temp_air: '' } });
		expect(readDraft(s, 'bat_a')).toEqual({ note: 'Smells sour', values: { ph: '3.6' } });
		expect(s.m.has(draftKey('bat_b'))).toBe(false);

		writeDraft(s, 'bat_a', { note: ' ', values: { ph: '' } });
		expect(readDraft(s, 'bat_a')).toBeNull();

		writeDraft(s, 'bat_a', { note: 'Again', values: {} });
		clearDraft(s, 'bat_a');
		expect(readDraft(s, 'bat_a')).toBeNull();
	});

	it('survives broken or missing storage', () => {
		const s = memory();
		s.setItem(draftKey('bat_a'), '{not json');
		expect(readDraft(s, 'bat_a')).toBeNull();
		const broken = {
			getItem: () => {
				throw new Error('blocked');
			},
			setItem: () => {
				throw new Error('full');
			},
			removeItem: () => {
				throw new Error('blocked');
			}
		};
		expect(readDraft(broken, 'bat_a')).toBeNull();
		expect(() => writeDraft(broken, 'bat_a', { note: 'x', values: {} })).not.toThrow();
		expect(readDraft(undefined, 'bat_a')).toBeNull();
	});
});
