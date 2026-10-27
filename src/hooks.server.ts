import type { ServerInit } from '@sveltejs/kit/hooks';

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
