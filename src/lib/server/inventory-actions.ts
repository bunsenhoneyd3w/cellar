import { fail, type RequestEvent } from '@sveltejs/kit';
import { getDb } from './db';
import { undoUse, useOne } from './inventory';
import { num, str } from './form';
import { inputFail } from './actions';

// "Used one" and its Undo (D31). Any page that shows ShelfItemRow spreads
// these into its own actions, like taskActions for task rows.

export const inventoryActions = {
	use: async ({ request }: RequestEvent) => {
		const id = str(await request.formData(), 'itemId');
		if (!id) return fail(400, { error: 'No item was given.' });
		try {
			const { item, before } = useOne(getDb(), id);
			return { used: { id: item.id, name: item.name, before } };
		} catch (e) {
			return inputFail(e);
		}
	},

	undoUse: async ({ request }: RequestEvent) => {
		const fd = await request.formData();
		const id = str(fd, 'itemId');
		const before = num(fd, 'before');
		if (!id || before === null) return fail(400, { error: 'Nothing to undo.' });
		try {
			undoUse(getDb(), id, before);
			return { undone: true };
		} catch (e) {
			return inputFail(e);
		}
	}
};
