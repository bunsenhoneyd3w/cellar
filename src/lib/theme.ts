// Light or dark (D50): the phone decides unless Settings picks one. The
// choice lives in a cookie on that phone, so the server can draw the right
// colors on the first paint.

export const THEME_COOKIE = 'theme';
export const THEMES = ['light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

export function readTheme(value: string | undefined | null): Theme | null {
	return THEMES.find((t) => t === value) ?? null;
}

/** The attribute put on <html>: empty when the phone decides. */
export function themeAttribute(theme: Theme | null): string {
	return theme ? `data-theme="${theme}"` : '';
}
