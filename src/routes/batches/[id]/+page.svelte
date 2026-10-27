<script lang="ts">
	import { resolve } from '$app/paths';
	import { dayNumber, formatDate } from '#lib/time.ts';
	import { formatRange } from '#lib/protocol-body.ts';
	import { readingKind } from '#lib/reading-kinds.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const b = $derived(data.batch);
	const snap = $derived(b.protocolSnapshotJson);
	const finished = $derived(b.status === 'done' || b.status === 'failed');
	const day = $derived(b.startedAt ? dayNumber(b.startedAt, b.endedAt) : null);
</script>

<h1 class="text-2xl font-bold">{b.name}</h1>
<p class="mb-4 text-gray-600">
	{#if b.status === 'planned'}
		Starts {formatDate(b.startedAt)}
	{:else if finished}
		{b.status === 'done' ? 'Done' : 'Failed'} {formatDate(b.endedAt)} after {day} days
	{:else}
		Day {day}{snap?.body.expectedDays ? ` of about ${snap.body.expectedDays}` : ''}
	{/if}
	{#if b.phase}
		· {b.phase}{/if}
</p>

<dl class="card mb-6 divide-y divide-gray-100 text-sm">
	<div class="flex justify-between gap-4 px-4 py-2">
		<dt class="text-gray-500">Where</dt>
		<dd>{data.space?.name ?? 'Not set'}</dd>
	</div>
	<div class="flex justify-between gap-4 px-4 py-2">
		<dt class="text-gray-500">Started</dt>
		<dd>{formatDate(b.startedAt)}</dd>
	</div>
	{#if data.equipment.length}
		<div class="flex justify-between gap-4 px-4 py-2">
			<dt class="text-gray-500">Equipment</dt>
			<dd class="text-right">{data.equipment.map((e) => e.name).join(', ')}</dd>
		</div>
	{/if}
	{#if snap}
		<div class="flex justify-between gap-4 px-4 py-2">
			<dt class="text-gray-500">Protocol</dt>
			<dd class="text-right">
				<a class="underline" href={resolve('/protocols/[id]', { id: snap.protocolId })}
					>{snap.name} v{snap.version}</a
				>
				{#if data.latestProtocol && data.latestProtocol.version > snap.version}
					<span class="block text-gray-500">v{data.latestProtocol.version} exists</span>
				{/if}
			</dd>
		</div>
	{/if}
</dl>

{#if b.notes}<p class="mb-6 whitespace-pre-line text-gray-700">{b.notes}</p>{/if}

{#if snap}
	<details class="card mb-6 px-4 py-3">
		<summary class="cursor-pointer font-medium">Method as started (v{snap.version})</summary>
		{#if snap.body.ingredients.length}
			<h3 class="section-title mt-4">Ingredients</h3>
			<ul class="list-inside list-disc text-gray-700">
				{#each snap.body.ingredients as line, i (i)}<li>{line}</li>{/each}
			</ul>
		{/if}
		{#if snap.body.steps.length}
			<h3 class="section-title mt-4">Steps</h3>
			<ol class="list-inside list-decimal text-gray-700">
				{#each snap.body.steps as line, i (i)}<li>{line}</li>{/each}
			</ol>
		{/if}
		{#if snap.body.targets.length}
			<h3 class="section-title mt-4">Targets</h3>
			<ul class="text-gray-700">
				{#each snap.body.targets as t (t.kind)}
					<li>{readingKind(t.kind)?.label ?? t.kind}: {formatRange(t)}</li>
				{/each}
			</ul>
		{/if}
	</details>
{/if}

<section class="mb-6">
	<h2 class="section-title">Timeline</h2>
	{#if data.observations.length === 0}
		<p class="empty">No observations yet.</p>
	{/if}
</section>

<a class="btn w-full" href={resolve('/batches/[id]/edit', { id: b.id })}>Edit batch details</a>
