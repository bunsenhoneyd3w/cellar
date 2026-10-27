<script lang="ts">
	import { resolve } from '$app/paths';
	import { label } from '#lib/enums.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<div class="mb-5 flex items-center justify-between">
	<h1 class="text-2xl font-bold">Equipment</h1>
	<a class="btn-primary" href={resolve('/equipment/new')}>Add equipment</a>
</div>

{#if data.equipment.length === 0}
	<p class="empty">No equipment yet. Add crocks, jars, airlocks, and meters you use.</p>
{:else}
	<ul class="card divide-y divide-gray-200">
		{#each data.equipment as e (e.id)}
			<li>
				<a href={resolve('/equipment/[id]', { id: e.id })} class="block px-4 py-3">
					<span class="flex items-center justify-between">
						<span class="font-medium">{e.name}</span>
						<span class="text-sm text-gray-500">{label(e.kind)}</span>
					</span>
					{#if e.model || e.spaceName}
						<span class="block text-sm text-gray-500">
							{[e.model, e.spaceName].filter(Boolean).join(' · ')}
						</span>
					{/if}
				</a>
			</li>
		{/each}
	</ul>
{/if}
