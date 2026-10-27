<script lang="ts">
	import { resolve } from '$app/paths';
	import SpaceForm from '#lib/components/SpaceForm.svelte';
	import { formatCount } from '#lib/shelf.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<h1 class="mb-5 text-2xl font-bold">Edit space</h1>

{#if data.items.length}
	<section class="mb-6">
		<h2 class="section-title">On this shelf</h2>
		<ul class="card divide-y divide-gray-100">
			{#each data.items as item (item.id)}
				<li>
					<a
						href={resolve('/inventory/[id]', { id: item.id })}
						class="flex justify-between gap-3 px-4 py-2"
					>
						<span>{item.name}</span>
						<span class="shrink-0 text-gray-600">{formatCount(item.quantity, item.unit)}</span>
					</a>
				</li>
			{/each}
		</ul>
	</section>
{/if}
<SpaceForm
	values={data.space}
	spaces={data.spaces}
	error={form?.error}
	submitLabel="Save changes"
/>
<p class="mt-4 text-xs text-gray-400">{data.space.id}</p>
