<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import { dayNumber, formatDueDate, localDate, toLocalInput } from '#lib/time.ts';
	import { formatRecurrence } from '#lib/recurrence.ts';
	import { formatRange, targetFor } from '#lib/protocol-body.ts';
	import {
		CONTAMINATION_ACTIONS,
		CONTAMINATION_KINDS,
		CONTAMINATION_LABELS,
		CONTAMINATION_SEVERITIES,
		label
	} from '#lib/enums.ts';
	import PhaseButtons from '#lib/components/PhaseButtons.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// Built for one thumb in a basement: big targets, number keypad for
	// readings, camera first, and Save always within reach at the bottom.

	let values = $state<Record<string, string>>({});
	let photos = $state<{ file: File; url: string }[]>([]);
	let saving = $state(false);
	let observedAt = $state('');
	// svelte-ignore state_referenced_locally
	let phase = $state(data.batch.phase ?? '');

	// Targets follow the phase picked on this screen, so tapping Fruiting shows fruiting ranges (D25).
	const target = (kind: string) => targetFor(data.targets, kind, phase);

	// Harvest part (D23, D36): open on its own in fruiting and harvest, one tap away otherwise.
	// A number is a flush on a grow and a harvest on a tower.
	const word = $derived(data.harvestWord);
	let harvestShown = $state(false);
	const harvestOpen = $derived(harvestShown || phase === 'fruiting' || phase === 'harvest');
	// svelte-ignore state_referenced_locally
	let flush = $state(data.nextFlush ?? 1);
	const maxFlush = $derived(data.nextFlush ?? 1);

	const NOTE_HINTS: Record<string, string> = {
		preserve: 'Into the canner, jars sealed or not, anything off',
		hydroponic: 'Roots, leaf color, tip burn, pests, anything off',
		seedling: 'Sprouts, leaf color, legginess, damping off, anything off'
	};

	// Contamination events (D22), one card each.
	let contamKeys = $state<number[]>([]);
	let nextContamKey = 0;
	function outOfRange(kind: string): boolean {
		const t = target(kind);
		const v = Number(values[kind]);
		if (!t || values[kind] === undefined || values[kind] === '' || !Number.isFinite(v))
			return false;
		return (t.min !== null && v < t.min) || (t.max !== null && v > t.max);
	}

	function addPhotos(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		for (const file of input.files ?? []) photos.push({ file, url: URL.createObjectURL(file) });
		input.value = '';
	}
	function removePhoto(i: number) {
		URL.revokeObjectURL(photos[i].url);
		photos.splice(i, 1);
	}

	const submit: SubmitFunction = ({ formData }) => {
		saving = true;
		formData.delete('photos');
		for (const p of photos) formData.append('photos', p.file);
		return async ({ update }) => {
			await update({ reset: false });
			saving = false;
		};
	};
</script>

<p class="text-sm text-gray-500">
	Day {data.batch.startedAt ? dayNumber(data.batch.startedAt) : 0}
</p>
<h1 class="mb-4 text-xl font-bold">{data.batch.name}</h1>

{#if form?.error}<p class="error">{form.error}</p>{/if}

{#snippet choices(name: string, values: readonly string[], cols: string, legend: string)}
	<fieldset>
		<legend class="mb-1 text-sm text-gray-600">{legend}</legend>
		<div class="grid {cols} gap-2">
			{#each values as v (v)}
				<label
					class="btn min-h-12 cursor-pointer px-2 text-sm has-checked:border-gray-800 has-checked:bg-gray-800 has-checked:text-white"
				>
					<input class="sr-only" type="radio" {name} value={v} />
					{CONTAMINATION_LABELS[v] ?? v}
				</label>
			{/each}
		</div>
	</fieldset>
{/snippet}

<form method="POST" enctype="multipart/form-data" use:enhance={submit} class="space-y-6">
	{#if data.dueTasks.length}
		<section>
			<h2 class="section-title">Tasks due</h2>
			<div class="card divide-y divide-gray-100">
				{#each data.dueTasks as t (t.id)}
					<label class="flex min-h-14 cursor-pointer items-center gap-4 px-4 py-2">
						<input type="checkbox" name="taskId" value={t.id} class="size-7 rounded" />
						<span class="flex-1">
							<span class="block">{t.title}</span>
							<span class="block text-xs text-gray-500">
								{formatDueDate(t.dueAt)}{t.recurrence ? ` · ${formatRecurrence(t.recurrence)}` : ''}
							</span>
						</span>
					</label>
				{/each}
			</div>
			<p class="mt-1 text-sm text-gray-500">Tick what you did. Ticking alone is enough to save.</p>
		</section>
	{/if}

	{#if data.fixedPhases}
		<fieldset>
			<legend class="section-title">Phase</legend>
			<PhaseButtons phases={data.fixedPhases} bind:value={phase} />
		</fieldset>
	{/if}

	<section>
		<h2 class="section-title">Photos</h2>
		<div class="grid grid-cols-2 gap-3">
			<label class="btn-primary cursor-pointer">
				Camera
				<input
					class="sr-only"
					type="file"
					name="photos"
					accept="image/*"
					capture="environment"
					onchange={addPhotos}
				/>
			</label>
			<label class="btn cursor-pointer">
				Library
				<input
					class="sr-only"
					type="file"
					name="photos"
					accept="image/*"
					multiple
					onchange={addPhotos}
				/>
			</label>
		</div>
		{#if photos.length}
			<ul class="mt-3 grid grid-cols-3 gap-2">
				{#each photos as p, i (p.url)}
					<li class="relative">
						<img
							src={p.url}
							alt="New photo {i + 1}"
							class="aspect-square w-full rounded-lg object-cover"
						/>
						<button
							type="button"
							class="absolute top-1 right-1 flex size-8 items-center justify-center rounded-full bg-black/60 text-white"
							aria-label="Remove photo {i + 1}"
							onclick={() => removePhoto(i)}>×</button
						>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	{#if data.harvest}
		<section>
			<h2 class="section-title">Harvest</h2>
			{#if harvestOpen}
				<div class="card divide-y divide-gray-100">
					<label class="flex min-h-14 items-center gap-3 px-4 py-2">
						<span class="flex-1">{data.harvest.label}</span>
						<input
							class="input w-28 text-right text-lg"
							name="r_{data.harvest.kind}"
							type="number"
							step="any"
							min="0"
							inputmode="decimal"
						/>
						<span class="w-10 text-sm text-gray-500">{data.harvest.unit}</span>
					</label>
					<div class="flex min-h-14 items-center gap-3 px-4 py-2">
						<span class="flex-1">
							<span class="block">{label(word)}</span>
							<span class="block text-xs text-gray-500">
								{#if data.lastFlush}
									Last harvest: {word}
									{data.lastFlush.flush}, {formatDueDate(localDate(data.lastFlush.harvestedAt))}
								{:else}
									First harvest
								{/if}
							</span>
						</span>
						<button
							type="button"
							class="btn size-12 px-0 text-xl"
							aria-label="Earlier {word}"
							disabled={flush <= 1}
							onclick={() => (flush = Math.max(1, flush - 1))}>−</button
						>
						<output class="w-8 text-center text-lg font-semibold" aria-live="polite">{flush}</output
						>
						<button
							type="button"
							class="btn size-12 px-0 text-xl"
							aria-label="Later {word}"
							disabled={flush >= maxFlush}
							onclick={() => (flush = Math.min(maxFlush, flush + 1))}>+</button
						>
						<input type="hidden" name="flush" value={flush} />
					</div>
				</div>
				<p class="mt-1 text-sm text-gray-500">
					{flush === maxFlush && data.lastFlush
						? `A new ${word}. Tap − if this finishes the last one.`
						: 'Weigh the whole harvest, in grams.'}
				</p>
			{:else}
				<button type="button" class="btn w-full" onclick={() => (harvestShown = true)}
					>Log a harvest</button
				>
			{/if}
		</section>
	{/if}

	<section>
		<h2 class="section-title">Readings</h2>
		<div class="card divide-y divide-gray-100">
			{#each data.kinds as k (k.kind)}
				{@const t = target(k.kind)}
				<label class="flex min-h-14 items-center gap-3 px-4 py-2">
					<span class="flex-1">
						<span class="block">{k.label}</span>
						<span class="block text-xs text-gray-500">
							{#if t}Target {formatRange(t)}{/if}
							{#if t && data.last[k.kind] !== undefined}
								·
							{/if}
							{#if data.last[k.kind] !== undefined}Last {data.last[k.kind]}{/if}
						</span>
					</span>
					<input
						class="input w-28 text-right text-lg {outOfRange(k.kind)
							? 'border-amber-500 bg-amber-50'
							: ''}"
						name="r_{k.kind}"
						type="number"
						step="any"
						inputmode="decimal"
						enterkeyhint="next"
						bind:value={values[k.kind]}
					/>
					<span class="w-10 text-sm text-gray-500">{k.unit}</span>
				</label>
			{/each}
		</div>
	</section>

	{#if data.contamination}
		<section>
			<h2 class="section-title">Contamination</h2>
			<input type="hidden" name="contamCount" value={contamKeys.length} />
			<div class="space-y-3">
				{#each contamKeys as key, i (key)}
					<div class="card space-y-3 px-3 py-3">
						<div class="flex items-center justify-between">
							<span class="font-medium">Contamination {i + 1}</span>
							<button
								type="button"
								class="btn size-10 px-0"
								aria-label="Remove contamination {i + 1}"
								onclick={() => contamKeys.splice(i, 1)}>×</button
							>
						</div>
						{@render choices(
							`c_${i}_kind`,
							CONTAMINATION_KINDS,
							'grid-cols-2',
							'What it looks like'
						)}
						{@render choices(`c_${i}_severity`, CONTAMINATION_SEVERITIES, 'grid-cols-3', 'How bad')}
						{@render choices(`c_${i}_action`, CONTAMINATION_ACTIONS, 'grid-cols-2', 'What you did')}
					</div>
				{/each}
			</div>
			<button type="button" class="btn mt-2 w-full" onclick={() => contamKeys.push(nextContamKey++)}
				>{contamKeys.length ? 'Add another' : 'Log contamination'}</button
			>
			{#if contamKeys.length}
				<p class="mt-1 text-sm text-gray-500">
					Add a close-up photo above; it stays with this check-in.
				</p>
			{/if}
		</section>
	{/if}

	<section>
		<label class="section-title block" for="note">Note</label>
		<textarea
			class="input"
			id="note"
			name="note"
			rows="3"
			placeholder={data.contamination
				? 'Colonization, pins, smell, color, anything off'
				: (NOTE_HINTS[data.batch.batchType] ?? 'Smell, color, bubbles, film, anything off')}
		></textarea>
	</section>

	{#if !data.fixedPhases}
		<section>
			<label class="section-title block" for="phase">Phase</label>
			<input class="input" id="phase" name="phase" list="phases" bind:value={phase} />
			<datalist id="phases">
				{#each data.phases as ph (ph)}<option value={ph}></option>{/each}
			</datalist>
		</section>
	{/if}

	<!-- Left empty, the server stamps the moment Save is pressed. -->
	<details ontoggle={(e) => (observedAt ||= e.currentTarget.open ? toLocalInput(null) : '')}>
		<summary class="cursor-pointer py-2 text-gray-600">Logged at save time. Change it</summary>
		<input class="input mt-2" name="observedAt" type="datetime-local" bind:value={observedAt} />
	</details>

	<div
		class="sticky z-10 -mx-4 bg-gray-50/95 px-4 py-3"
		style="bottom: calc(3.5rem + env(safe-area-inset-bottom))"
	>
		<button class="btn-primary min-h-14 w-full text-lg" disabled={saving}>
			{saving ? 'Saving...' : 'Save observation'}
		</button>
	</div>
</form>
