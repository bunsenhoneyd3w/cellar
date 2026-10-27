import { kindsFor } from '../reading-kinds';
import type { ProtocolBody, TargetRange } from '../protocol-body';
import { lines, num, str } from './form';
import type { ProtocolInput } from './protocols';

/**
 * Reads the protocol form. `base` is the body being edited, so fields the form
 * does not show (such as the Paprika uid) carry over to the new version.
 */
export function readProtocolForm(fd: FormData, base?: ProtocolBody): ProtocolInput {
	const targets: TargetRange[] = [];
	for (const k of kindsFor('ferment')) {
		const min = num(fd, `min_${k.kind}`);
		const max = num(fd, `max_${k.kind}`);
		if (min !== null || max !== null) targets.push({ kind: k.kind, min, max, unit: k.unit });
	}
	return {
		name: str(fd, 'name') ?? '',
		batchType: 'ferment',
		source: str(fd, 'source'),
		notes: str(fd, 'notes'),
		bodyJson: {
			...base,
			ingredients: lines(str(fd, 'ingredients')),
			steps: lines(str(fd, 'steps')),
			targets,
			expectedDays: num(fd, 'expectedDays'),
			servings: str(fd, 'servings'),
			sourceUrl: str(fd, 'sourceUrl')
		}
	};
}
