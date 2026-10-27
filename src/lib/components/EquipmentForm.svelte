<script lang="ts">
	import { enhance } from '$app/forms';
	import { EQUIPMENT_KINDS, label } from '#lib/enums.ts';
	import type { SpaceNode } from '#lib/server/spaces.ts';

	type Values = {
		name?: string;
		kind?: string;
		model?: string | null;
		specsText?: string;
		spaceId?: string | null;
		notes?: string | null;
	};
	type Props = {
		values?: Values;
		spaces: SpaceNode[];
		error?: string;
		submitLabel: string;
		action?: string;
	};
	let { values = {}, spaces, error, submitLabel, action }: Props = $props();
</script>

<form method="POST" {action} use:enhance class="space-y-4">
	{#if error}<p class="error">{error}</p>{/if}

	<div>
		<label class="label" for="name">Name</label>
		<input class="input" id="name" name="name" required value={values.name ?? ''} />
	</div>

	<div>
		<label class="label" for="kind">Kind</label>
		<select class="input" id="kind" name="kind" value={values.kind ?? 'fermenter'}>
			{#each EQUIPMENT_KINDS as k (k)}<option value={k}>{label(k)}</option>{/each}
		</select>
	</div>

	<div>
		<label class="label" for="model">Model</label>
		<input class="input" id="model" name="model" value={values.model ?? ''} />
	</div>

	<div>
		<label class="label" for="spaceId">Usually lives in</label>
		<select class="input" id="spaceId" name="spaceId" value={values.spaceId ?? ''}>
			<option value="">Not set</option>
			{#each spaces as s (s.id)}<option value={s.id}>{s.path}</option>{/each}
		</select>
	</div>

	<div>
		<label class="label" for="specs">Specs</label>
		<textarea
			class="input font-mono text-sm"
			id="specs"
			name="specs"
			rows="4"
			placeholder="capacity_gal: 1&#10;material: stoneware">{values.specsText ?? ''}</textarea
		>
		<p class="mt-1 text-sm text-gray-500">One per line, as name: value.</p>
	</div>

	<div>
		<label class="label" for="notes">Notes</label>
		<textarea class="input" id="notes" name="notes" rows="3">{values.notes ?? ''}</textarea>
	</div>

	<button class="btn-primary w-full">{submitLabel}</button>
</form>
