<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import EquipmentForm from '#lib/components/EquipmentForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// Picking a photo sends it straight away; there is nothing else to fill in.
	let adding = $state(false);
	function send(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		if (input.files?.length) input.form?.requestSubmit();
	}
</script>

<h1 class="mb-5 text-2xl font-bold">{data.item.name}</h1>

<section class="mb-6">
	<h2 class="section-title">Photos</h2>
	{#if data.photos.length}
		<ul class="mb-3 grid grid-cols-3 gap-2">
			{#each data.photos as p, i (p.id)}
				<li class="relative">
					<!-- eslint-disable svelte/no-navigation-without-resolve -->
					<a href="{resolve('/')}photos/{p.path}" target="_blank" rel="noopener">
						<img
							src="{resolve('/')}photos/{p.path}"
							alt="{data.item.name}, photo {i + 1}"
							loading="lazy"
							class="aspect-square w-full rounded-lg object-cover"
						/>
					</a>
					<!-- eslint-enable svelte/no-navigation-without-resolve -->
					<form
						method="POST"
						action="?/deletePhoto"
						use:enhance
						onsubmit={(e) => {
							if (!confirm('Remove this photo?')) e.preventDefault();
						}}
					>
						<input type="hidden" name="photoId" value={p.id} />
						<button
							class="absolute top-1 right-1 flex size-8 items-center justify-center rounded-full bg-black/60 text-white"
							aria-label="Remove photo {i + 1}">×</button
						>
					</form>
				</li>
			{/each}
		</ul>
	{/if}
	<form
		method="POST"
		action="?/photo"
		enctype="multipart/form-data"
		use:enhance={() => {
			adding = true;
			return async ({ update }) => {
				await update();
				adding = false;
			};
		}}
		class="grid grid-cols-2 gap-3"
	>
		<label class="btn cursor-pointer {adding ? 'opacity-50' : ''}">
			{adding ? 'Adding...' : 'Camera'}
			<input
				class="sr-only"
				type="file"
				name="photos"
				accept="image/*"
				capture="environment"
				disabled={adding}
				onchange={send}
			/>
		</label>
		<label class="btn cursor-pointer {adding ? 'opacity-50' : ''}">
			Library
			<input
				class="sr-only"
				type="file"
				name="photos"
				accept="image/*"
				multiple
				disabled={adding}
				onchange={send}
			/>
		</label>
	</form>
</section>

<h2 class="section-title">Details</h2>
<EquipmentForm
	action="?/save"
	values={{ ...data.item, specsText: data.specsText }}
	spaces={data.spaces}
	error={form?.error}
	submitLabel="Save changes"
/>
<p class="mt-4 text-xs text-gray-400">{data.item.id}</p>
