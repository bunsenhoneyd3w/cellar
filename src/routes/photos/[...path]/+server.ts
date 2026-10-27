import { error } from '@sveltejs/kit';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { photosDir } from '#lib/server/paths.ts';
import { resolveInside } from '#lib/server/photos.ts';
import type { RequestHandler } from './$types';

const TYPES: Record<string, string> = {
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.png': 'image/png',
	'.webp': 'image/webp',
	'.gif': 'image/gif',
	'.heic': 'image/heic',
	'.heif': 'image/heif'
};

/** Serves files from the photos folder. Names are unique ids, so browsers may cache them for good. */
export const GET: RequestHandler = async ({ params }) => {
	const full = resolveInside(photosDir(), params.path);
	if (!full) error(404, 'Photo not found');
	let data: Buffer;
	try {
		data = await readFile(full);
	} catch {
		error(404, 'Photo not found');
	}
	return new Response(new Uint8Array(data), {
		headers: {
			'content-type': TYPES[path.extname(full).toLowerCase()] ?? 'application/octet-stream',
			'cache-control': 'public, max-age=31536000, immutable'
		}
	});
};
