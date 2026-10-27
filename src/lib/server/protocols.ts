import { asc, desc, eq } from 'drizzle-orm';
import type { Db } from './db';
import { protocol } from './db/schema';
import { newId } from './db/ids';
import type { BatchType } from '../enums';
import { bodyTasks, type ProtocolBody } from '../protocol-body';
import { recurrenceDays } from '../recurrence';
import { InputError } from './form';
import { recipeNotes, recipeToBody, type PaprikaRecipe } from './paprika';

export type Protocol = typeof protocol.$inferSelect;
export type ProtocolInput = {
	name: string;
	batchType: BatchType;
	source?: string | null;
	bodyJson: ProtocolBody;
	notes?: string | null;
};

/** The newest version of every protocol, with how many versions exist. */
export function listProtocols(db: Db, batchType?: BatchType) {
	const rows = db
		.select()
		.from(protocol)
		.where(batchType ? eq(protocol.batchType, batchType) : undefined)
		.orderBy(asc(protocol.name), desc(protocol.version))
		.all();
	const latest = new Map<string, Protocol & { versions: number }>();
	for (const r of rows) {
		const seen = latest.get(r.familyId);
		if (seen) seen.versions++;
		else latest.set(r.familyId, { ...r, versions: 1 });
	}
	return [...latest.values()];
}

export function getProtocol(db: Db, id: string): Protocol | undefined {
	return db.select().from(protocol).where(eq(protocol.id, id)).get();
}

export function getVersions(db: Db, familyId: string): Protocol[] {
	return db
		.select()
		.from(protocol)
		.where(eq(protocol.familyId, familyId))
		.orderBy(desc(protocol.version))
		.all();
}

export function createProtocol(db: Db, input: ProtocolInput): Protocol {
	check(input);
	return db
		.insert(protocol)
		.values({ ...input, familyId: newId('prf'), version: 1 })
		.returning()
		.get();
}

/**
 * Saves an edit as a new version. The old row is never changed, so batches
 * that point at it keep the method they were started with.
 */
export function reviseProtocol(db: Db, id: string, input: ProtocolInput): Protocol {
	check(input);
	const current = getProtocol(db, id);
	if (!current) throw new InputError('That protocol no longer exists.');
	const newest = getVersions(db, current.familyId)[0];
	if (sameContent(newest, input)) return newest;
	return db
		.insert(protocol)
		.values({ ...input, familyId: current.familyId, version: newest.version + 1 })
		.returning()
		.get();
}

function sameContent(p: Protocol, input: ProtocolInput) {
	return (
		p.name === input.name &&
		p.batchType === input.batchType &&
		(p.source ?? null) === (input.source ?? null) &&
		(p.notes ?? null) === (input.notes ?? null) &&
		JSON.stringify(p.bodyJson) === JSON.stringify(input.bodyJson)
	);
}

function check(input: ProtocolInput) {
	if (!input.name.trim()) throw new InputError('Give the protocol a name.');
	for (const t of input.bodyJson.targets) {
		if (t.min !== null && t.max !== null && t.min > t.max) {
			throw new InputError(`The ${t.kind} target has a minimum above its maximum.`);
		}
	}
	for (const t of bodyTasks(input.bodyJson)) {
		const name = t.title.trim();
		if (!name) throw new InputError('Every task in the list needs a name.');
		if (!Number.isInteger(t.startDay) || t.startDay < 0) {
			throw new InputError(`${name}: the first day is a whole number, 0 or more.`);
		}
		if (t.recurrence && recurrenceDays(t.recurrence) === null) {
			throw new InputError(`${name}: repeat every 1 to 365 days.`);
		}
		if (t.endDay !== null && (!Number.isInteger(t.endDay) || t.endDay < t.startDay)) {
			throw new InputError(`${name}: the last day is a whole number on or after the first day.`);
		}
	}
}

/** Paprika uids that already have a protocol, so a re-import can skip them. */
export function importedPaprikaUids(db: Db): Set<string> {
	const rows = db
		.select({ body: protocol.bodyJson })
		.from(protocol)
		.where(eq(protocol.source, 'Paprika import'))
		.all();
	return new Set(rows.map((r) => r.body.paprikaUid).filter((u): u is string => !!u));
}

/** Creates a ferment protocol for each chosen recipe that was not imported before. */
export function importRecipes(db: Db, recipes: PaprikaRecipe[], uids: string[]): Protocol[] {
	const already = importedPaprikaUids(db);
	const wanted = new Set(uids);
	return db.transaction((tx) =>
		recipes
			.filter((r) => wanted.has(r.uid) && !already.has(r.uid))
			.map((r) =>
				createProtocol(tx, {
					name: r.name,
					batchType: 'ferment',
					source: 'Paprika import',
					bodyJson: recipeToBody(r),
					notes: recipeNotes(r)
				})
			)
	);
}
