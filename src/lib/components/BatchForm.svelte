<script lang="ts">
	import { enhance } from '$app/forms';
	import { PHASE_SUGGESTIONS } from '#lib/enums.ts';
	import { batchName } from '#lib/batch-name.ts';
	import type { SpaceNode } from '#lib/server/spaces.ts';

	type Option = { id: string; name: string };
	type Values = {
		name?: string;
		protocolId?: string | null;
		spaceId?: string | null;
		equipmentIds?: string[];
		startedAt?: string;
		phase?: string | null;
		notes?: string | null;
	};
	type Props = {
		values: Values;
		/** Only when starting a batch; an existing batch keeps its protocol. */
		protocols?: (Option & { version: number })[];
		nextNumber?: number;
		spaces: SpaceNode[];
		equipment: (Option & { kind: string })[];
		error?: string;
		submitLabel: string;
	};
	let {
		values,
		protocols,
		nextNumber = 1,
		spaces,
		equipment,
		error,
		submitLabel
	}: Props = $props();

	// Suggest "Ferment 003 <protocol>" until the name is typed over.
	// svelte-ignore state_referenced_locally
	let protocolId = $state(values.protocolId ?? protocols?.[0]?.id ?? '');
	const suggest = (id: string) => {
		const p = protocols?.find((x) => x.id === id);
		return p ? batchName('ferment', nextNumber, p.name) : '';
	};
	// svelte-ignore state_referenced_locally
	let name = $state(values.name ?? suggest(protocolId));
	let nameTouched = $state(false);
	$effect(() => {
		if (protocols && !nameTouched) name = suggest(protocolId);
	});
</script>

<form method="POST" use:enhance class="space-y-4">
	{#if error}<p class="error">{error}</p>{/if}

	{#if protocols}
		<div>
			<label class="label" for="protocolId">Protocol</label>
			<select class="input" id="protocolId" name="protocolId" bind:value={protocolId} required>
				{#each protocols as p (p.id)}
					<option value={p.id}>{p.name} (v{p.version})</option>
				{/each}
			</select>
		</div>
	{/if}

	<div>
		<label class="label" for="name">Batch name</label>
		<input
			class="input"
			id="name"
			name="name"
			required
			bind:value={name}
			oninput={() => (nameTouched = true)}
		/>
	</div>

	<div>
		<label class="label" for="startedAt">Day 0</label>
		<input
			class="input"
			id="startedAt"
			name="startedAt"
			type="datetime-local"
			value={values.startedAt}
		/>
	</div>

	<div>
		<label class="label" for="phase">Phase</label>
		<input class="input" id="phase" name="phase" list="phases" value={values.phase ?? ''} />
		<datalist id="phases">
			{#each PHASE_SUGGESTIONS.ferment as ph (ph)}<option value={ph}></option>{/each}
		</datalist>
	</div>

	<div>
		<label class="label" for="spaceId">Where</label>
		<select class="input" id="spaceId" name="spaceId" value={values.spaceId ?? ''}>
			<option value="">Not set</option>
			{#each spaces as s (s.id)}<option value={s.id}>{s.path}</option>{/each}
		</select>
	</div>

	{#if equipment.length}
		<fieldset>
			<legend class="label">Equipment</legend>
			<div class="card divide-y divide-gray-100">
				{#each equipment as e (e.id)}
					<label class="flex min-h-12 items-center gap-3 px-4">
						<input
							type="checkbox"
							name="equipmentIds"
							value={e.id}
							checked={values.equipmentIds?.includes(e.id)}
							class="size-6 rounded"
						/>
						<span>{e.name}</span>
					</label>
				{/each}
			</div>
		</fieldset>
	{/if}

	<div>
		<label class="label" for="notes">Notes</label>
		<textarea class="input" id="notes" name="notes" rows="3">{values.notes ?? ''}</textarea>
	</div>

	<button class="btn-primary w-full">{submitLabel}</button>
</form>
