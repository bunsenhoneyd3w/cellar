<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import { dayNumber, toLocalInput } from '#lib/time.ts';
	import { formatRange } from '#lib/protocol-body.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// Built for one thumb in a basement: big targets, number keypad for
	// readings, camera first, and Save always within reach at the bottom.

	let values = $state<Record<string, string>>({});
	let photos = $state<{ file: File; url: string }[]>([]);
	let saving = $state(false);
	let observedAt = $state('');

	const target = (kind: string) => data.targets.find((t) => t.kind === kind);
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

<form method="POST" enctype="multipart/form-data" use:enhance={submit} class="space-y-6">
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

	<section>
		<label class="section-title block" for="note">Note</label>
		<textarea
			class="input"
			id="note"
			name="note"
			rows="3"
			placeholder="Smell, color, bubbles, film, anything off"></textarea>
	</section>

	<section>
		<label class="section-title block" for="phase">Phase</label>
		<input class="input" id="phase" name="phase" list="phases" value={data.batch.phase ?? ''} />
		<datalist id="phases">
			{#each data.phases as ph (ph)}<option value={ph}></option>{/each}
		</datalist>
	</section>

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
