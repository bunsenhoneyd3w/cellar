<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { EQUIPMENT_KINDS, label } from '#lib/enums.ts';
	import {
		SIZE_NAMES,
		SIZE_SOURCE_LABELS,
		SIZE_UNITS,
		blankReviewItem,
		sizeSource,
		unitLabel,
		type ReviewSize
	} from '#lib/equipment-scan.ts';
	import type { ScanReview } from '#lib/server/scan-form.ts';
	import type { SpaceNode } from '#lib/server/spaces.ts';

	type Props = { review: ScanReview; notice: string | null; error?: string; spaces: SpaceNode[] };
	let { review, notice, error, spaces }: Props = $props();

	// The page keys this component on the review, so local edits start fresh for each photo.
	// svelte-ignore state_referenced_locally
	let items = $state(structuredClone(review.items));
	// svelte-ignore state_referenced_locally
	let spaceId = $state(review.spaceId ?? '');
	let saving = $state(false);
	const kept = $derived(items.filter((it) => it.keep).length);

	function addSize(sizes: ReviewSize[]) {
		// A new size has no value yet; the server drops it if it stays empty.
		sizes.push({
			name: 'capacity',
			unit: 'gal',
			value: null as unknown as number,
			source: 'entered',
			original: null,
			confirmed: false
		});
	}
</script>

<form
	method="POST"
	action="?/save"
	use:enhance={() => {
		saving = true;
		return async ({ update }) => {
			await update({ reset: false });
			saving = false;
		};
	}}
	class="space-y-4"
>
	<input type="hidden" name="photoPath" value={review.photo.path} />
	<input type="hidden" name="photoOriginalPath" value={review.photo.originalPath ?? ''} />
	<input type="hidden" name="itemCount" value={items.length} />

	<!-- eslint-disable svelte/no-navigation-without-resolve -->
	<a href="{resolve('/')}photos/{review.photo.path}" target="_blank" rel="noopener">
		<img
			src="{resolve('/')}photos/{review.photo.path}"
			alt="Your shelf or item"
			class="max-h-64 w-full rounded-lg bg-gray-100 object-contain"
		/>
	</a>
	<!-- eslint-enable svelte/no-navigation-without-resolve -->

	{#if error}<p class="error">{error}</p>{/if}
	{#if notice}
		<p class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">{notice}</p>
	{:else}
		<p class="text-sm text-gray-600">
			Found {items.length}
			{items.length === 1 ? 'item' : 'items'}. Untick anything you don't want and check the sizes.
		</p>
	{/if}

	<div>
		<label class="label" for="spaceId">Where these live</label>
		<select class="input" id="spaceId" name="spaceId" bind:value={spaceId}>
			<option value="">Not set</option>
			{#each spaces as s (s.id)}<option value={s.id}>{s.path}</option>{/each}
		</select>
	</div>

	{#each items as it, i (i)}
		<div class="card px-3 py-3 {it.keep ? '' : 'opacity-60'}">
			<label class="flex min-h-12 cursor-pointer items-center gap-3">
				<input type="checkbox" name="{i}_keep" bind:checked={it.keep} class="size-7 rounded" />
				<span class="min-w-0 flex-1">
					<span class="block font-medium">{it.name || `Item ${i + 1}`}</span>
					{#if it.where}<span class="block text-xs text-gray-500">{it.where}</span>{/if}
				</span>
			</label>

			<!-- Unticked cards keep their fields so nothing is lost if Seth ticks them again. -->
			<div class="mt-3 space-y-3 {it.keep ? '' : 'hidden'}">
				<input type="hidden" name="{i}_where" value={it.where} />
				<div>
					<label class="label" for="{i}_name">Name</label>
					<input class="input" id="{i}_name" name="{i}_name" bind:value={it.name} />
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="label" for="{i}_brand">Brand</label>
						<input class="input" id="{i}_brand" name="{i}_brand" bind:value={it.brand} />
					</div>
					<div>
						<label class="label" for="{i}_model">Model</label>
						<input class="input" id="{i}_model" name="{i}_model" bind:value={it.model} />
					</div>
				</div>
				<div class="grid grid-cols-[1fr_6rem] gap-3">
					<div>
						<label class="label" for="{i}_kind">Kind</label>
						<select class="input" id="{i}_kind" name="{i}_kind" bind:value={it.kind}>
							{#each EQUIPMENT_KINDS as k (k)}<option value={k}>{label(k)}</option>{/each}
						</select>
					</div>
					<div>
						<label class="label" for="{i}_count">How many</label>
						<input
							class="input text-right"
							id="{i}_count"
							name="{i}_count"
							type="number"
							min="1"
							step="1"
							inputmode="numeric"
							bind:value={it.count}
						/>
					</div>
				</div>

				<fieldset>
					<legend class="label">Sizes</legend>
					<input type="hidden" name="{i}_sizeCount" value={it.sizes.length} />
					<div class="space-y-2">
						{#each it.sizes as s, j (j)}
							{@const p = `${i}_s_${j}_`}
							{@const source = sizeSource(s)}
							<div
								class="rounded-lg border px-2 py-2 {source === 'estimate' && !s.confirmed
									? 'border-amber-300 bg-amber-50'
									: 'border-gray-200'}"
							>
								<div class="grid grid-cols-[1fr_5.5rem_4.5rem] gap-2">
									<select
										class="input px-2 text-sm"
										name="{p}name"
										aria-label="Size {j + 1} measures"
										bind:value={s.name}
									>
										{#each SIZE_NAMES as n (n)}<option value={n}>{label(n)}</option>{/each}
									</select>
									<input
										class="input text-right"
										name="{p}value"
										type="number"
										step="any"
										min="0"
										inputmode="decimal"
										aria-label="Size {j + 1} value"
										bind:value={s.value}
									/>
									<select
										class="input px-2 text-sm"
										name="{p}unit"
										aria-label="Size {j + 1} unit"
										bind:value={s.unit}
									>
										{#each SIZE_UNITS as u (u)}<option value={u}>{unitLabel(u)}</option>{/each}
									</select>
								</div>
								<input type="hidden" name="{p}source" value={s.source} />
								<input type="hidden" name="{p}original" value={s.original ?? ''} />
								<div class="mt-1 flex min-h-8 items-center justify-between gap-2 text-xs">
									<span
										class={source === 'estimate' ? 'font-semibold text-amber-800' : 'text-gray-500'}
									>
										{SIZE_SOURCE_LABELS[source]}
									</span>
									{#if source === 'estimate'}
										<label class="flex cursor-pointer items-center gap-2 text-sm">
											<input
												type="checkbox"
												name="{p}ok"
												bind:checked={s.confirmed}
												class="size-6 rounded"
											/>
											Looks right
										</label>
									{/if}
								</div>
							</div>
						{/each}
					</div>
					<button
						type="button"
						class="btn mt-2 min-h-10 w-full text-sm"
						onclick={() => addSize(it.sizes)}>Add a size</button
					>
					{#if it.sizes.length}
						<p class="mt-1 text-xs text-gray-500">Clear a value to leave that size out.</p>
					{/if}
				</fieldset>
			</div>
		</div>
	{/each}

	<button type="button" class="btn w-full" onclick={() => items.push(blankReviewItem())}
		>Add an item it missed</button
	>

	<div
		class="sticky z-10 -mx-4 bg-gray-50/95 px-4 py-3"
		style="bottom: calc(3.5rem + env(safe-area-inset-bottom))"
	>
		<button class="btn-primary min-h-14 w-full text-lg" disabled={saving || kept === 0}>
			{saving ? 'Saving...' : `Save ${kept} ${kept === 1 ? 'item' : 'items'}`}
		</button>
	</div>
</form>
