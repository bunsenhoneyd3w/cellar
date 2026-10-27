<script lang="ts">
	import { resolve } from '$app/paths';
	import { label } from '#lib/enums.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<div class="mb-5 flex items-center justify-between">
	<h1 class="text-2xl font-bold">Spaces</h1>
	<a class="btn-primary" href={resolve('/spaces/new')}>Add space</a>
</div>

{#if data.spaces.length === 0}
	<p class="empty">
		No spaces yet. Start with the room, then add shelves and containers inside it.
	</p>
{:else}
	<ul class="card divide-y divide-gray-200">
		{#each data.spaces as s (s.id)}
			<li>
				<a
					href={resolve('/spaces/[id]', { id: s.id })}
					class="flex items-center justify-between px-4 py-3"
					style="padding-left: {1 + s.depth * 1.25}rem"
				>
					<span class="font-medium">{s.name}</span>
					<span class="text-sm text-gray-500">{label(s.kind)}</span>
				</a>
			</li>
		{/each}
	</ul>
{/if}
