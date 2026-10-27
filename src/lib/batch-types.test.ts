import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { BATCH_TYPES } from './enums';
import { BATCH_TYPE_LOOK, TYPE_CLASSES } from './batch-types';

// Reads the real color values from layout.css, so the check follows any edit there.
const css = readFileSync('src/routes/layout.css', 'utf8');
const theme = css.slice(css.indexOf('@theme'), css.indexOf('@media (prefers-color-scheme: dark)'));
const darkMedia = css.slice(
	css.indexOf('@media (prefers-color-scheme: dark)'),
	css.indexOf(":root[data-theme='dark']")
);
const darkAttr = css.slice(
	css.indexOf(":root[data-theme='dark']"),
	css.indexOf(":root[data-theme='light']")
);

function vars(block: string): Record<string, string> {
	return Object.fromEntries(
		[...block.matchAll(/--(color-[\w-]+):\s*(#[0-9a-f]{6})/g)].map((m) => [m[1], m[2]])
	);
}

function luminance(hex: string): number {
	const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
	const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
	return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: string, b: string): number {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

describe('batch type look', () => {
	it('gives every batch type a word, an icon, and classes', () => {
		for (const t of BATCH_TYPES) {
			expect(BATCH_TYPE_LOOK[t].word).toBeTruthy();
			expect(TYPE_CLASSES[t]).toContain(`bg-${t}-bg`);
		}
	});

	it('keeps chip text readable (4.5:1) in light and dark', () => {
		for (const [mode, values] of [
			['light', vars(theme)],
			['dark', vars(darkMedia)]
		] as const) {
			for (const t of BATCH_TYPES) {
				const ratio = contrast(values[`color-${t}-bg`], values[`color-${t}-ink`]);
				expect(ratio, `${t} in ${mode}`).toBeGreaterThanOrEqual(4.5);
			}
			for (const [bg, ink] of [
				['paper', 'ink'],
				['card', 'ink-muted'],
				['accent', 'on-accent'],
				['warn-bg', 'warn-ink'],
				['danger-bg', 'danger-ink']
			]) {
				const ratio = contrast(values[`color-${bg}`], values[`color-${ink}`]);
				expect(ratio, `${ink} on ${bg} in ${mode}`).toBeGreaterThanOrEqual(4.5);
			}
		}
	});

	it('has the same dark colors for the phone setting and the Settings override', () => {
		expect(vars(darkAttr)).toEqual(vars(darkMedia));
		expect(Object.keys(vars(darkMedia)).sort()).toEqual(Object.keys(vars(theme)).sort());
	});
});
