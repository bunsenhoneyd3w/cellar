<script lang="ts">
	import { enhance } from '$app/forms';
	import { SPACE_KINDS, label } from '#lib/enums.ts';
	import type { SpaceNode } from '#lib/server/spaces.ts';

	type Props = {
		values?: Partial<SpaceNode>;
		spaces: SpaceNode[];
		error?: string;
		submitLabel: string;
	};
	let { values = {}, spaces, error, submitLabel }: Props = $props();

	// A space cannot be its own parent, so leave it out of the list.
	const parents = $derived(spaces.filter((s) => s.id !== values.id));
</script>

<form method="POST" use:enhance class="space-y-4">
	{#if error}<p class="error">{error}</p>{/if}

	<div>
		<label class="label" for="name">Name</label>
		<input class="input" id="name" name="name" required value={values.name ?? ''} />
	</div>

	<div>
		<label class="label" for="kind">Kind</label>
		<select class="input" id="kind" name="kind" value={values.kind ?? 'room'}>
			{#each SPACE_KINDS as k (k)}<option value={k}>{label(k)}</option>{/each}
		</select>
	</div>

	<div>
		<label class="label" for="parentSpaceId">Inside</label>
		<select
			class="input"
			id="parentSpaceId"
			name="parentSpaceId"
			value={values.parentSpaceId ?? ''}
		>
			<option value="">Nothing (top level)</option>
			{#each parents as p (p.id)}<option value={p.id}>{p.path}</option>{/each}
		</select>
	</div>

	<div>
		<label class="label" for="notes">Notes</label>
		<textarea class="input" id="notes" name="notes" rows="3">{values.notes ?? ''}</textarea>
	</div>

	<button class="btn-primary w-full">{submitLabel}</button>
</form>
