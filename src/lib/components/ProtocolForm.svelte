<script lang="ts">
	import { enhance } from '$app/forms';
	import { kindsFor } from '#lib/reading-kinds.ts';
	import type { ProtocolBody } from '#lib/protocol-body.ts';

	type Values = {
		name?: string;
		source?: string | null;
		notes?: string | null;
		bodyJson?: ProtocolBody;
	};
	type Props = { values?: Values; error?: string; submitLabel: string };
	let { values = {}, error, submitLabel }: Props = $props();

	const body = $derived(values.bodyJson);
	const kinds = kindsFor('ferment');
	const target = (kind: string) => body?.targets.find((t) => t.kind === kind);
</script>

<form method="POST" use:enhance class="space-y-4">
	{#if error}<p class="error">{error}</p>{/if}

	<div>
		<label class="label" for="name">Name</label>
		<input class="input" id="name" name="name" required value={values.name ?? ''} />
	</div>

	<div>
		<label class="label" for="ingredients">Ingredients</label>
		<textarea class="input" id="ingredients" name="ingredients" rows="6"
			>{body?.ingredients.join('\n') ?? ''}</textarea
		>
		<p class="mt-1 text-sm text-gray-500">One per line.</p>
	</div>

	<div>
		<label class="label" for="steps">Steps</label>
		<textarea class="input" id="steps" name="steps" rows="8"
			>{body?.steps.join('\n') ?? ''}</textarea
		>
		<p class="mt-1 text-sm text-gray-500">One per line.</p>
	</div>

	<div class="grid grid-cols-2 gap-3">
		<div>
			<label class="label" for="expectedDays">Expected days</label>
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
		<div>
			<label class="label" for="servings">Makes</label>
			<input class="input" id="servings" name="servings" value={body?.servings ?? ''} />
		</div>
	</div>

	<fieldset>
		<legend class="label">Target ranges</legend>
		<p class="mb-2 text-sm text-gray-500">Leave blank for readings you do not track.</p>
		<div class="card divide-y divide-gray-200">
			{#each kinds as k (k.kind)}
				{@const t = target(k.kind)}
				<div class="grid grid-cols-[1fr_5.5rem_5.5rem] items-center gap-2 px-3 py-2">
					<span class="text-sm">{k.label} <span class="text-gray-500">({k.unit})</span></span>
					<input
						class="input min-h-10 text-sm"
						name="min_{k.kind}"
						type="number"
						step="any"
						inputmode="decimal"
						placeholder="min"
						aria-label="{k.label} minimum"
						value={t?.min ?? ''}
					/>
					<input
						class="input min-h-10 text-sm"
						name="max_{k.kind}"
						type="number"
						step="any"
						inputmode="decimal"
						placeholder="max"
						aria-label="{k.label} maximum"
						value={t?.max ?? ''}
					/>
				</div>
			{/each}
		</div>
	</fieldset>

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
