<script lang="ts">
	import { enhance } from '$app/forms';
	import { PHASE_SUGGESTIONS, fixedPhases, type BatchType } from '#lib/enums.ts';
	import { batchName } from '#lib/batch-name.ts';
	import PhaseButtons from '#lib/components/PhaseButtons.svelte';
	import type { SpaceNode } from '#lib/server/spaces.ts';

	type Option = { id: string; name: string };
	type Values = {
		name?: string;
		batchType?: BatchType;
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
		protocols?: (Option & { version: number; batchType: BatchType })[];
		/** Next batch number per type, for the suggested name. */
		nextNumbers?: Partial<Record<BatchType, number>>;
		spaces: SpaceNode[];
		equipment: (Option & { kind: string })[];
		error?: string;
		submitLabel: string;
	};
	let {
		values,
		protocols,
		nextNumbers = {},
		spaces,
		equipment,
		error,
		submitLabel
	}: Props = $props();

	// Suggest "Ferment 003 <protocol>" or "Grow 001 <protocol>" until the name is typed over.
	// svelte-ignore state_referenced_locally
	let protocolId = $state(values.protocolId ?? protocols?.[0]?.id ?? '');
	const suggest = (id: string) => {
		const p = protocols?.find((x) => x.id === id);
		return p ? batchName(p.batchType, nextNumbers[p.batchType] ?? 1, p.name) : '';
	};
	// A new batch takes its type from the protocol; an existing one keeps its own.
	const type = $derived<BatchType>(
		protocols?.find((p) => p.id === protocolId)?.batchType ?? values.batchType ?? 'ferment'
	);
	const phases = $derived(fixedPhases(type));
	const firstPhase = (t: BatchType) =>
		fixedPhases(t)?.[0] ?? (t === 'ferment' ? 'primary ferment' : '');
	// svelte-ignore state_referenced_locally
	let phase = $state(values.phase ?? (protocols ? firstPhase(type) : ''));
	let phaseType = $state<BatchType | null>(null);
	$effect(() => {
		// Switching to a protocol of another type starts at that type's first phase.
		if (!protocols) return;
		if (phaseType !== null && phaseType !== type) phase = firstPhase(type);
		phaseType = type;
	});
	// svelte-ignore state_referenced_locally
	let name = $state(values.name ?? suggest(protocolId));
	let nameTouched = $state(false);
	const showTypes = $derived(new Set(protocols?.map((p) => p.batchType)).size > 1);
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
					<option value={p.id}>{p.name} (v{p.version}){showTypes ? `, ${p.batchType}` : ''}</option>
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

	{#if phases}
		<fieldset>
			<legend class="label">Phase</legend>
			<PhaseButtons {phases} bind:value={phase} />
		</fieldset>
	{:else}
		<div>
			<label class="label" for="phase">Phase</label>
			<input class="input" id="phase" name="phase" list="phases" bind:value={phase} />
			<datalist id="phases">
				{#each PHASE_SUGGESTIONS[type] as ph (ph)}<option value={ph}></option>{/each}
			</datalist>
		</div>
	{/if}

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
