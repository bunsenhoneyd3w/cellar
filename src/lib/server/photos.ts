import sharp from 'sharp';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { newId } from './db/ids';
import { photosDir } from './paths';

// Photos live on disk, never in the database (CLAUDE.md rule 6). Each upload
// keeps its original under originals/ and gets a resized JPEG (D12) that the
// app shows. Paths stored in the database are relative to the photos folder,
// so the folder can move (for example to an SSD on the Pi).

export const MAX_DIMENSION = 2000;

export type SavedPhoto = { id: string; path: string; originalPath: string };

const EXTENSIONS: Record<string, string> = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp',
	'image/heic': 'heic',
	'image/heif': 'heif',
	'image/gif': 'gif'
};

function extensionFor(name: string, mime: string): string {
	const fromName = path.extname(name).slice(1).toLowerCase();
	if (/^[a-z0-9]{2,5}$/.test(fromName)) return fromName === 'jpeg' ? 'jpg' : fromName;
	return EXTENSIONS[mime] ?? 'bin';
}

/**
 * Writes the original and a resized copy. If the image cannot be decoded
 * (a HEIC file, say), the original is kept and also used as the display copy.
 */
export async function savePhoto(
	data: Uint8Array,
	fileName: string,
	mime: string,
	when = new Date(),
	root = photosDir()
): Promise<SavedPhoto> {
	const id = newId('pho');
	const month = path.join(String(when.getFullYear()), String(when.getMonth() + 1).padStart(2, '0'));
	const originalPath = path.join('originals', month, `${id}.${extensionFor(fileName, mime)}`);
	mkdirSync(path.join(root, 'originals', month), { recursive: true });
	writeFileSync(path.join(root, originalPath), data);

	const resizedPath = path.join(month, `${id}.jpg`);
	mkdirSync(path.join(root, month), { recursive: true });
	try {
		await sharp(data)
			.rotate() // apply the phone's orientation flag so photos are not sideways
			.resize({
				width: MAX_DIMENSION,
				height: MAX_DIMENSION,
				fit: 'inside',
				withoutEnlargement: true
			})
			.jpeg({ quality: 82 })
			.toFile(path.join(root, resizedPath));
		return { id, path: resizedPath, originalPath };
	} catch {
		return { id, path: originalPath, originalPath };
	}
}

export function deletePhotoFiles(paths: (string | null)[], root = photosDir()) {
	for (const p of new Set(paths)) {
		const full = resolveInside(root, p);
		if (full) rmSync(full, { force: true });
	}
}

/** Full path for a stored relative path, or null if it would escape the photos folder. */
export function resolveInside(root: string, relative: string | null): string | null {
	if (!relative) return null;
	const full = path.resolve(root, relative);
	return full.startsWith(path.resolve(root) + path.sep) ? full : null;
}
