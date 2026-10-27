<script lang="ts">
	import { resolve } from '$app/paths';
	import { dayNumber, formatDate } from '#lib/time.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	function lastSeen(iso: string | null) {
		if (!iso) return 'No observations yet';
		const d = dayNumber(iso);
		return d === 0 ? 'Checked today' : d === 1 ? 'Checked yesterday' : `Checked ${d} days ago`;
	}
</script>

<h1 class="mb-5 text-2xl font-bold">Today</h1>

<section class="mb-6">
	<h2 class="section-title">Due tasks</h2>
	<p class="empty">Nothing yet. Phase 2 adds tasks.</p>
</section>

<section class="mb-6">
	<h2 class="section-title">Active batches</h2>
	{#if data.batches.length === 0}
		<p class="empty">
			No batches running.
			<a class="underline" href={resolve('/batches/new')}>Start a ferment</a>
		</p>
	{:else}
		<ul class="space-y-2">
			{#each data.batches as b (b.id)}
				<li>
					<a href={resolve('/batches/[id]', { id: b.id })} class="card block px-4 py-3">
						<span class="flex items-baseline justify-between gap-3">
							<span class="font-medium">{b.name}</span>
							<span class="shrink-0 text-sm text-gray-500">
								{b.status === 'planned'
									? `Starts ${formatDate(b.startedAt)}`
									: `Day ${b.startedAt ? dayNumber(b.startedAt) : 0}`}
							</span>
						</span>
						<span class="block text-sm text-gray-500">
							{b.phase ? `${b.phase} · ` : ''}{lastSeen(b.lastObservedAt)}
						</span>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</section>
