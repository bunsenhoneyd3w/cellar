<script lang="ts">
	import { untrack } from 'svelte';
	import { JAR_SIZES, PRESERVE_METHODS, PRESERVE_METHOD_LABELS } from '#lib/enums.ts';
	import type { Processing } from '#lib/protocol-body.ts';

	/** Processing details of a preserve protocol (D28), with the shelf life (D30). */
	type Props = { processing?: Processing; shelfLifeMonths?: number | null };
	let { processing, shelfLifeMonths = null }: Props = $props();

	// Each jar row is posted as jar_<n>_<field>. Rows left empty are ignored.
	type Row = { key: number; size: string; minutes: number | null; psi: number | null };
	let nextKey = 0;
	const blank = (size = ''): Row => ({ key: nextKey++, size, minutes: null, psi: null });
	// Starts from the saved values; edits after that live only in the form until it is saved.
	let method = $state(untrack(() => processing?.method ?? 'water_bath'));
	let rows = $state<Row[]>(
		untrack(() =>
			processing?.jars.length
				? processing.jars.map((j) => ({ key: nextKey++, ...j }))
				: [blank('pint')]
		)
	);
	const pressure = $derived(method === 'pressure');
	// Fridge, freezer, and dehydrated preserves have no canner time.
	const timed = $derived(method === 'water_bath' || method === 'pressure' || method === 'steam');
</script>

<fieldset>
	<legend class="label">Processing</legend>
	<div class="grid grid-cols-2 gap-2">
		{#each PRESERVE_METHODS as m (m)}
			<label
				class="btn cursor-pointer has-checked:border-gray-800 has-checked:bg-gray-800 has-checked:text-white"
			>
				<input class="sr-only" type="radio" name="method" value={m} bind:group={method} />
				{PRESERVE_METHOD_LABELS[m]}
			</label>
		{/each}
	</div>
</fieldset>

{#if timed}
	<div>
		<label class="label" for="headspaceIn">Headspace (inches)</label>
		<input
			class="input"
			id="headspaceIn"
			name="headspaceIn"
			type="number"
			step="0.125"
			min="0"
			inputmode="decimal"
			placeholder="0.5"
			value={processing?.headspaceIn ?? ''}
		/>
		<p class="mt-1 text-sm text-gray-500">0.25 is 1/4 inch, 0.5 is 1/2 inch, 1 is 1 inch.</p>
	</div>
{/if}

<fieldset>
	<legend class="label">{timed ? 'Time per jar size' : 'Jar or bag sizes'}</legend>
	{#if timed}
		<p class="mb-2 text-sm text-gray-500">
			Enter times{pressure ? ' and psi' : ''} for your altitude (Stevens Point is about 1,100 ft). Cellar
			does not adjust them.
		</p>
	{/if}
	<input type="hidden" name="jarCount" value={rows.length} />
	<datalist id="jar-sizes">
		{#each JAR_SIZES as s (s)}<option value={s}></option>{/each}
	</datalist>
	<div class="space-y-2">
		{#each rows as row, i (row.key)}
			<div
				class="grid items-center gap-2 {timed
					? pressure
						? 'grid-cols-[1fr_4.5rem_4rem_2.75rem]'
						: 'grid-cols-[1fr_5rem_2.75rem]'
					: 'grid-cols-[1fr_2.75rem]'}"
			>
				<input
					class="input"
					name="jar_{i}_size"
					list="jar-sizes"
					placeholder="pint"
					aria-label="Jar size {i + 1}"
					bind:value={row.size}
				/>
				{#if timed}
					<input
						class="input"
						name="jar_{i}_minutes"
						type="number"
						min="1"
						inputmode="numeric"
						placeholder="min"
						aria-label="Minutes for jar size {i + 1}"
						bind:value={row.minutes}
					/>
				{/if}
				{#if pressure}
					<input
						class="input"
						name="jar_{i}_psi"
						type="number"
						min="1"
						step="any"
						inputmode="decimal"
						placeholder="psi"
						aria-label="Psi for jar size {i + 1}"
						bind:value={row.psi}
					/>
				{/if}
				<button
					type="button"
					class="btn px-0"
					aria-label="Remove jar size {i + 1}"
					onclick={() => rows.splice(i, 1)}>×</button
				>
			</div>
		{/each}
	</div>
	<button type="button" class="btn mt-2 w-full" onclick={() => rows.push(blank())}
		>Add a jar size</button
	>
</fieldset>

<div>
	<label class="label" for="shelfLifeMonths">Shelf life (months)</label>
	<input
		class="input"
		id="shelfLifeMonths"
		name="shelfLifeMonths"
		type="number"
		min="1"
		max="120"
		inputmode="numeric"
		placeholder="18"
		value={shelfLifeMonths ?? ''}
	/>
	<p class="mt-1 text-sm text-gray-500">Fills in the use-by date on jars from this recipe.</p>
</div>
