<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const o = $derived(data.outcome);
	const editing = $derived(data.batch.status === 'done' || data.batch.status === 'failed');
	const initialStatus = $derived(data.batch.status === 'failed' || data.failed ? 'failed' : 'done');
	const yieldValue = $derived(o?.yieldValue ?? data.suggested?.value ?? '');
	const yieldUnit = $derived(o?.yieldUnit ?? data.suggested?.unit ?? '');
</script>

<h1 class="text-2xl font-bold">{editing ? 'Edit outcome' : 'Finish batch'}</h1>
<p class="mb-5 text-gray-600">{data.batch.name}</p>

{#if form?.error}<p class="error">{form.error}</p>{/if}

<form method="POST" use:enhance class="space-y-5">
	<fieldset>
		<legend class="label">How did it end?</legend>
		<div class="grid grid-cols-2 gap-3">
			{#each [['done', 'Done'], ['failed', 'Failed']] as [value, text] (value)}
				<label
					class="btn cursor-pointer has-checked:border-gray-800 has-checked:bg-gray-800 has-checked:text-white"
				>
					<input
						class="sr-only"
						type="radio"
						name="status"
						{value}
						checked={initialStatus === value}
					/>
					{text}
				</label>
			{/each}
		</div>
	</fieldset>

	<div>
		<label class="label" for="endedAt">Ended</label>
		<input class="input" id="endedAt" name="endedAt" type="datetime-local" value={data.endedAt} />
	</div>

	<div class="grid grid-cols-[1fr_8rem] gap-3">
		<div>
			<label class="label" for="yieldValue">Yield</label>
			<input
				class="input"
				id="yieldValue"
				name="yieldValue"
				type="number"
				step="any"
				min="0"
				inputmode="decimal"
				value={yieldValue}
			/>
		</div>
		<div>
			<label class="label" for="yieldUnit">Unit</label>
			<input
				class="input"
				id="yieldUnit"
				name="yieldUnit"
				list="yield-units"
				placeholder="pints"
				value={yieldUnit}
			/>
			<datalist id="yield-units">
				{#each ['pints', 'quarts', 'jars', 'bottles', 'oz', 'lb', 'g', 'gal'] as u (u)}
					<option value={u}></option>
				{/each}
			</datalist>
		</div>
	</div>
	{#if data.suggested}
		<p class="-mt-3 text-sm text-gray-500">
			Filled in from {data.flushCount} flush{data.flushCount === 1 ? '' : 'es'}. Change it if you
			weighed more.
		</p>
	{/if}

	<fieldset>
		<legend class="label">Rating</legend>
		<div class="grid grid-cols-5 gap-2">
			{#each [1, 2, 3, 4, 5] as n (n)}
				<label
					class="btn cursor-pointer px-0 text-lg has-checked:border-gray-800 has-checked:bg-gray-800 has-checked:text-white"
				>
					<input class="sr-only" type="radio" name="rating" value={n} checked={o?.rating === n} />
					{n}
				</label>
			{/each}
		</div>
		<p class="mt-1 text-sm text-gray-500">1 is poor, 5 is make it again exactly.</p>
	</fieldset>

	<div>
		<label class="label" for="summary">What happened</label>
		<textarea class="input" id="summary" name="summary" rows="4">{o?.summary ?? ''}</textarea>
	</div>

	<div>
		<label class="label" for="wouldChange">Next time I would change</label>
		<textarea class="input" id="wouldChange" name="wouldChange" rows="3"
			>{o?.wouldChange ?? ''}</textarea
		>
	</div>

	<button class="btn-primary min-h-14 w-full text-lg">
		{editing ? 'Save outcome' : 'Finish batch'}
	</button>
</form>
