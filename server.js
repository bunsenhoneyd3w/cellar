// Production server for the laptop and the Raspberry Pi: `npm start`.
//
// Cellar is served over plain HTTP on the home network (D16). SvelteKit's
// Node adapter assumes HTTPS unless told otherwise, and would then reject
// every form post from the phone as cross-site. This wrapper marks each
// request as HTTP, so the cross-site check still compares the page's own
// address (localhost, the laptop's IP, or cellar.local) with the form's.

import http from 'node:http';

process.env.PROTOCOL_HEADER = 'x-cellar-proto';
// Phone photos and Paprika exports are far larger than the 512 KB default.
process.env.BODY_SIZE_LIMIT ??= '500M';

const { handler } = await import('./build/handler.js');

const host = process.env.HOST ?? '0.0.0.0';
const port = Number(process.env.PORT ?? 3000);

http
	.createServer((req, res) => {
		req.headers['x-cellar-proto'] = 'http';
		handler(req, res, () => {
			res.statusCode = 404;
			res.end('Not found');
		});
	})
	.listen(port, host, () => {
		console.log(`Cellar is running on http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`);
	});
