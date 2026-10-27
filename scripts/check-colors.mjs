// Fails when a screen uses a raw Tailwind color (text-gray-500, bg-amber-50,
// and so on) instead of the named colors in src/routes/layout.css (D49).
// Raw colors skip dark mode, so one slip shows a light patch in the dark.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const RAW =
	/(?<![\w-])(?:[a-z-]+:)*(?:text|bg|border|divide|ring|fill|stroke|outline|placeholder|from|to|via)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g;

function* files(dir) {
	for (const name of readdirSync(dir)) {
		const full = path.join(dir, name);
		if (statSync(full).isDirectory()) yield* files(full);
		else if (/\.(svelte|ts|css|html)$/.test(name)) yield full;
	}
}

const problems = [];
for (const file of files('src')) {
	readFileSync(file, 'utf8')
		.split('\n')
		.forEach((line, i) => {
			for (const m of line.matchAll(RAW)) problems.push(`${file}:${i + 1}  ${m[0]}`);
		});
}
if (problems.length) {
	console.error('Raw Tailwind colors found; use the named colors in layout.css instead:');
	for (const p of problems) console.error('  ' + p);
	process.exit(1);
}
console.log('Colors: all named.');
