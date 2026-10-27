<script lang="ts">
	import { enhance } from '$app/forms';
	import { trackedKindsFor } from '#lib/reading-kinds.ts';
	import { fixedPhases, label, type BatchType } from '#lib/enums.ts';
	import TaskTemplatesField from '#lib/components/TaskTemplatesField.svelte';
	import { bodyTasks, type ProtocolBody } from '#lib/protocol-body.ts';

	type Values = {
		name?: string;
		source?: string | null;
		notes?: string | null;
		bodyJson?: ProtocolBody;
	};
	type Props = { values?: Values; batchType: BatchType; error?: string; submitLabel: string };
	let { values = {}, batchType, error, submitLabel }: Props = $props();

	const body = $derived(values.bodyJson);
	const kinds = $derived(trackedKindsFor(batchType));
	const phases = $derived(fixedPhases(batchType) ?? []);
	const grow = $derived(batchType === 'mushroom');
	// Exact match on phase, so an all-phases target never fills a phase row.
	const target = (kind: string, phase: string | null) =>
		body?.targets.find((t) => t.kind === kind && (t.phase ?? null) === phase);
	const hasTargets = (phase: string) => !!body?.targets.some((t) => t.phase === phase);
</script>

{#snippet targetRows(phase: string | null, suffix: string)}
	<div class="card divide-y divide-gray-200">
		{#each kinds as k (k.kind)}
			{@const t = target(k.kind, phase)}
			<div class="grid grid-cols-[1fr_5.5rem_5.5rem] items-center gap-2 px-3 py-2">
				<span class="text-sm">{k.label} <span class="text-gray-500">({k.unit})</span></span>
				<input
					class="input min-h-10 text-sm"
					name="min_{k.kind}{suffix}"
					type="number"
					step="any"
					inputmode="decimal"
					placeholder="min"
					aria-label="{k.label} minimum{phase ? `, ${phase}` : ''}"
					value={t?.min ?? ''}
				/>
				<input
					class="input min-h-10 text-sm"
					name="max_{k.kind}{suffix}"
					type="number"
					step="any"
					inputmode="decimal"
					placeholder="max"
					aria-label="{k.label} maximum{phase ? `, ${phase}` : ''}"
					value={t?.max ?? ''}
				/>
			</div>
		{/each}
	</div>
{/snippet}

<form method="POST" use:enhance class="space-y-4">
	{#if error}<p class="error">{error}</p>{/if}
	<input type="hidden" name="batchType" value={batchType} />

	<div>
		<label class="label" for="name">Name</label>
		<input class="input" id="name" name="name" required value={values.name ?? ''} />
	</div>

	<div>
		<label class="label" for="ingredients">{grow ? 'Materials' : 'Ingredients'}</label>
		<textarea class="input" id="ingredients" name="ingredients" rows="6"
			>{body?.ingredients.join('\n') ?? ''}</textarea
		>
		<p class="mt-1 text-sm text-gray-500">
			One per line.{grow ? ' Spawn, substrate, container.' : ''}
		</p>
	</div>

	<div>
		<label class="label" for="steps">{grow ? 'Tek steps' : 'Steps'}</label>
		<textarea class="input" id="steps" name="steps" rows="8"
			>{body?.steps.join('\n') ?? ''}</textarea
		>
		<p class="mt-1 text-sm text-gray-500">One per line.</p>
	</div>

	<div class="grid {grow ? '' : 'grid-cols-2'} gap-3">
		<div>
			<label class="label" for="expectedDays"
				>{grow ? 'Expected days, Day 0 to cleanup' : 'Expected days'}</label
			>
			<input
				class="input"
				id="expectedDays"
				name="expectedDays"
				type="number"
				inputmode="numeric"
				min="0"
				value={body?.expectedDays ?? ''}
			/>
		</div>
		{#if !grow}
			<div>
				<label class="label" for="servings">Makes</label>
				<input class="input" id="servings" name="servings" value={body?.servings ?? ''} />
			</div>
		{/if}
	</div>

	<fieldset>
		<legend class="label">Target ranges</legend>
		<p class="mb-2 text-sm text-gray-500">Leave blank for readings you do not track.</p>
		{#if phases.length}
			<p class="mb-1 text-sm font-medium">All phases</p>
		{/if}
		{@render targetRows(null, '')}
		{#if phases.length}
			<p class="mt-3 mb-2 text-sm text-gray-500">
				A phase's own range wins over the all-phases one while the batch is in that phase.
			</p>
			<div class="space-y-2">
				{#each phases as ph, i (ph)}
					<details class="card px-3 py-2" open={hasTargets(ph)}>
						<summary class="min-h-10 cursor-pointer py-2 font-medium">{label(ph)}</summary>
						<div class="pb-2">{@render targetRows(ph, `_p${i}`)}</div>
					</details>
				{/each}
			</div>
		{/if}
	</fieldset>

	<TaskTemplatesField tasks={bodyTasks(body)} {phases} />

	<div>
		<label class="label" for="source">Source</label>
		<input class="input" id="source" name="source" placeholder="own" value={values.source ?? ''} />
	</div>

	<div>
		<label class="label" for="sourceUrl">Source link</label>
		<input class="input" id="sourceUrl" name="sourceUrl" type="url" value={body?.sourceUrl ?? ''} />
	</div>

	<div>
		<label class="label" for="notes">Notes</label>
		<textarea class="input" id="notes" name="notes" rows="4">{values.notes ?? ''}</textarea>
	</div>

	<button class="btn-primary w-full">{submitLabel}</button>
</form>
