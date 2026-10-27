<script lang="ts">
	import { resolve } from '$app/paths';
	import { dayNumber, formatDate } from '#lib/time.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const tabs = [
		{ key: 'active', label: 'Active' },
		{ key: 'finished', label: 'Finished' },
		{ key: 'all', label: 'All' }
	];
</script>

<div class="mb-4 flex items-center justify-between">
	<h1 class="text-2xl font-bold">Batches</h1>
	<a class="btn-primary" href={resolve('/batches/new')}>Start batch</a>
</div>

<div class="mb-4 grid grid-cols-3 gap-2">
	{#each tabs as t (t.key)}
		<a
			href="{resolve('/batches')}?show={t.key}"
			class="btn {data.show === t.key
				? 'border-gray-800 bg-gray-800 text-white active:bg-gray-700'
				: ''}">{t.label}</a
		>
	{/each}
</div>

{#if data.batches.length === 0}
	<p class="empty">No batches here yet.</p>
{:else}
	<ul class="space-y-2">
		{#each data.batches as b (b.id)}
			<li>
				<a href={resolve('/batches/[id]', { id: b.id })} class="card block px-4 py-3">
					<span class="block font-medium">{b.name}</span>
					<span class="block text-sm text-gray-500">
						{#if b.status === 'active' && b.startedAt}
							Day {dayNumber(b.startedAt)}{b.phase ? ` · ${b.phase}` : ''}
						{:else if b.status === 'planned'}
							Starts {formatDate(b.startedAt)}
						{:else}
							{b.status === 'done' ? 'Done' : 'Failed'} {formatDate(b.endedAt)}
						{/if}
						{b.spaceName ? ` · ${b.spaceName}` : ''}
					</span>
				</a>
			</li>
		{/each}
	</ul>
{/if}
