import path from 'node:path';

// The two things that make a complete backup (CLAUDE.md rule 1). Both default
// to folders next to the app and can be moved with environment variables,
// e.g. to an SSD on the Pi.

export function dataDir(): string {
	return path.resolve(process.env.CELLAR_DATA_DIR ?? 'data');
}

export function photosDir(): string {
	return path.resolve(process.env.CELLAR_PHOTOS_DIR ?? 'photos');
}
