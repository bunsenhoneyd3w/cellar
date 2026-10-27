import { sql } from 'drizzle-orm';
import type { Db } from './db';
import { batch, equipment, protocol, space } from './db/schema';

// The "Set up your cellar" list on Today for a fresh install. Each step ticks
// itself off from the data, so there is nothing to dismiss or remember.

export type SetupProgress = {
	space: boolean;
	equipment: boolean;
	protocol: boolean;
	batch: boolean;
};

export function setupProgress(db: Db): SetupProgress {
	const any = (table: typeof space | typeof equipment | typeof protocol | typeof batch) =>
		(db
			.select({ n: sql<number>`count(*)` })
			.from(table)
			.get()?.n ?? 0) > 0;
	return {
		space: any(space),
		equipment: any(equipment),
		protocol: any(protocol),
		batch: any(batch)
	};
}
