<script lang="ts">
	import { enhance } from '$app/forms';
	import ScanReview from '#lib/components/ScanReview.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// Picking a photo sends it at once. While Claude reads it, show the picture and wait.
	let reading = $state(false);
	let preview = $state<string | null>(null);
	function send(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		if (preview) URL.revokeObjectURL(preview);
		preview = URL.createObjectURL(file);
		input.form?.requestSubmit();
	}
</script>

<h1 class="mb-5 text-2xl font-bold">Add from photo</h1>

{#if form && 'review' in form && form.review}
	{#key form.review}
		<ScanReview
			review={form.review}
			notice={form.notice}
			error={'error' in form ? form.error : undefined}
			spaces={data.spaces}
		/>
	{/key}
{:else}
	{#if form?.error}<p class="error">{form.error}</p>{/if}

	{#if reading}
		<div class="card space-y-3 px-4 py-4 text-center" aria-live="polite">
			{#if preview}
				<img src={preview} alt="Your shelf or item" class="max-h-64 w-full object-contain" />
			{/if}
			<p class="text-lg font-medium">
				{data.recognitionOn ? 'Reading the photo...' : 'Saving the photo...'}
			</p>
			{#if data.recognitionOn}
				<p class="text-sm text-ink-muted">This can take up to half a minute.</p>
			{/if}
		</div>
	{/if}

	<form
		method="POST"
		action="?/read"
		enctype="multipart/form-data"
		use:enhance={() => {
			reading = true;
			return async ({ update }) => {
				await update();
				reading = false;
			};
		}}
		class="space-y-4 {reading ? 'hidden' : ''}"
	>
		<p class="text-sm text-ink-muted">
			Take one photo of an item or a whole shelf.
			{data.recognitionOn
				? 'Claude lists what it sees, and you check it before anything is saved.'
				: 'Photo reading is off (no API key), so you will fill in the details yourself.'}
		</p>

		<div>
			<label class="label" for="spaceId">Where these live</label>
			<select class="input" id="spaceId" name="spaceId">
				<option value="">Not set</option>
				{#each data.spaces as s (s.id)}<option value={s.id}>{s.path}</option>{/each}
			</select>
		</div>

		<div class="grid grid-cols-2 gap-3">
			<label class="btn-primary cursor-pointer">
				Camera
				<input
					class="sr-only"
					type="file"
					name="photo"
					accept="image/*"
					capture="environment"
					onchange={send}
				/>
			</label>
			<label class="btn cursor-pointer">
				Library
				<input class="sr-only" type="file" name="photo" accept="image/*" onchange={send} />
			</label>
		</div>
	</form>
{/if}
