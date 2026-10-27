<script lang="ts">
	import IconBook from '@tabler/icons-svelte-runes/icons/book-2';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import TypeChip from '#lib/components/TypeChip.svelte';
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<h1 class="mb-4 text-2xl font-bold">Protocols</h1>

<div class="mb-5 grid grid-cols-2 gap-3">
	<a class="btn-primary" href={resolve('/protocols/import')}>Import from Paprika</a>
	<a class="btn" href={resolve('/protocols/new')}>New protocol</a>
</div>

{#if data.protocols.length === 0}
	<EmptyState icon={IconBook} title="No protocols yet">
		A protocol is the method a batch follows: a recipe, a grow tek, or a seed-starting plan. Import
		one from Paprika or write your own.
	</EmptyState>
{:else}
	<ul class="card divide-y divide-line">
		{#each data.protocols as p (p.id)}
			<li>
				<a href={resolve('/protocols/[id]', { id: p.id })} class="block px-4 py-3">
					<TypeChip type={p.batchType} />
					<span class="mt-0.5 block font-medium">{p.name}</span>
					<span class="block text-sm text-ink-muted">
						Version {p.version}{p.source ? ` · ${p.source}` : ''}
					</span>
				</a>
			</li>
		{/each}
	</ul>
{/if}
