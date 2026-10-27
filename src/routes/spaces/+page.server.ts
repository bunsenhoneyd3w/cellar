import { getDb } from '#lib/server/db/index.ts';
import { listSpaces } from '#lib/server/spaces.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({ spaces: listSpaces(getDb()) });
