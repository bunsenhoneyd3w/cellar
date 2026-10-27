import { fail } from '@sveltejs/kit';
import { InputError } from './form';

/** Turns a fixable input problem into a form error; anything else is a real bug and is rethrown. */
export function inputFail(e: unknown) {
	if (e instanceof InputError) return fail(400, { error: e.message });
	throw e;
}
