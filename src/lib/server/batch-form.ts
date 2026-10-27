import { fromLocalInput } from '../time';
import { str } from './form';
import type { BatchEditInput } from './batches';

export function readBatchForm(fd: FormData): BatchEditInput & { protocolId: string } {
	return {
		name: str(fd, 'name') ?? '',
		protocolId: str(fd, 'protocolId') ?? '',
		spaceId: str(fd, 'spaceId'),
		equipmentIds: fd.getAll('equipmentIds').map(String),
		startedAt: fromLocalInput(str(fd, 'startedAt')),
		phase: str(fd, 'phase'),
		notes: str(fd, 'notes')
	};
}
