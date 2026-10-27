import { getDb } from '#lib/server/db/index.ts';
import { listProtocols } from '#lib/server/protocols.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({ protocols: listProtocols(getDb()) });
