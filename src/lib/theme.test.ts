import { describe, expect, it } from 'vitest';
import { readTheme, themeAttribute } from './theme';

describe('theme choice', () => {
	it('accepts light or dark and ignores anything else', () => {
		expect(readTheme('dark')).toBe('dark');
		expect(readTheme('light')).toBe('light');
		expect(readTheme('auto')).toBeNull();
		expect(readTheme(undefined)).toBeNull();
		expect(themeAttribute('dark')).toBe('data-theme="dark"');
		expect(themeAttribute(null)).toBe('');
	});
});
