<script lang="ts">
	import { resolve } from '$app/paths';
	import { label } from '#lib/enums.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<h1 class="mb-4 text-2xl font-bold">Protocols</h1>

<div class="mb-5 grid grid-cols-2 gap-3">
	<a class="btn-primary" href={resolve('/protocols/import')}>Import from Paprika</a>
	<a class="btn" href={resolve('/protocols/new')}>New protocol</a>
</div>

{#if data.protocols.length === 0}
	<p class="empty">
		No protocols yet. Import a recipe from Paprika, or write a recipe or grow tek.
	</p>
{:else}
	<ul class="card divide-y divide-line">
		{#each data.protocols as p (p.id)}
			<li>
				<a href={resolve('/protocols/[id]', { id: p.id })} class="block px-4 py-3">
					<span class="block font-medium">{p.name}</span>
					<span class="block text-sm text-ink-muted">
						{label(p.batchType)} · version {p.version}{p.source ? ` · ${p.source}` : ''}
					</span>
				</a>
			</li>
		{/each}
	</ul>
{/if}
