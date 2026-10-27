import { error, redirect } from '@sveltejs/kit';
import { getDb } from '#lib/server/db/index.ts';
import {
	addEquipmentPhoto,
	deleteEquipmentPhoto,
	formatSpecs,
	getEquipment,
	listEquipmentPhotos,
	parseSpecs,
	updateEquipment
} from '#lib/server/equipment.ts';
import { listSpaces } from '#lib/server/spaces.ts';
import { deletePhotoFiles, savePhoto, type SavedPhoto } from '#lib/server/photos.ts';
import { oneOf, str } from '#lib/server/form.ts';
import { inputFail } from '#lib/server/actions.ts';
import { EQUIPMENT_KINDS } from '#lib/enums.ts';
import { nowIso } from '#lib/time.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const db = getDb();
	const item = getEquipment(db, params.id);
	if (!item) error(404, 'Equipment not found');
	return {
		item,
		specsText: formatSpecs(item.specsJson),
		spaces: listSpaces(db),
		photos: listEquipmentPhotos(db, item.id)
	};
};

export const actions: Actions = {
	save: async ({ request, params }) => {
		const fd = await request.formData();
		try {
			updateEquipment(getDb(), params.id, {
				name: str(fd, 'name') ?? '',
				kind: oneOf(fd, 'kind', EQUIPMENT_KINDS) ?? 'other',
				model: str(fd, 'model'),
				specsJson: parseSpecs(str(fd, 'specs')),
				spaceId: str(fd, 'spaceId'),
				notes: str(fd, 'notes')
			});
		} catch (e) {
			return inputFail(e);
		}
		redirect(303, '/equipment');
	},

	// Photos added by hand (D45). Each file is saved, then linked; on a failure the files go.
	photo: async ({ request, params }) => {
		const fd = await request.formData();
		const files = fd.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0);
		const saved: SavedPhoto[] = [];
		try {
			for (const f of files) {
				saved.push(await savePhoto(new Uint8Array(await f.arrayBuffer()), f.name, f.type));
			}
			const db = getDb();
			db.transaction((tx) => {
				for (const s of saved) addEquipmentPhoto(tx, params.id, s, nowIso());
			});
		} catch (e) {
			deletePhotoFiles(saved.flatMap((s) => [s.path, s.originalPath]));
			return inputFail(e);
		}
	},

	deletePhoto: async ({ request }) => {
		const fd = await request.formData();
		const id = str(fd, 'photoId');
		if (id) deleteEquipmentPhoto(getDb(), id);
	}
};
