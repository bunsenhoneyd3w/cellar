import type { Handle, ServerInit } from '@sveltejs/kit/hooks';
import { readTheme, themeAttribute, THEME_COOKIE } from '#lib/theme.ts';

// Settings such as the Anthropic API key for photo reading (D47) live in a
// .env file next to the app, never in the database. Loading it here covers
// both `npm run dev` and `npm start`. Values already set in the shell win.
export const init: ServerInit = () => {
	try {
		process.loadEnvFile();
	} catch {
		// No .env file: photo reading stays off.
	}
};

// Puts the light or dark choice from Settings on <html> (D50).
export const handle: Handle = ({ event, resolve }) => {
	const attr = themeAttribute(readTheme(event.cookies.get(THEME_COOKIE)));
	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%cellar.theme%', attr)
	});
};
