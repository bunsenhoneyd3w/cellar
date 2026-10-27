import { getDb } from '#lib/server/db/index.ts';
import { listEquipment } from '#lib/server/equipment.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({ equipment: listEquipment(getDb()) });
