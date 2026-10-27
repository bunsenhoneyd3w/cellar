<script lang="ts">
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import ReadingChart from '#lib/components/ReadingChart.svelte';
	import { dayNumber, formatDate, formatDateTime } from '#lib/time.ts';
	import { formatRange } from '#lib/protocol-body.ts';
	import { READING_KINDS, readingKind } from '#lib/reading-kinds.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const b = $derived(data.batch);
	const snap = $derived(b.protocolSnapshotJson);
	const finished = $derived(b.status === 'done' || b.status === 'failed');
	const day = $derived(b.startedAt ? dayNumber(b.startedAt, b.endedAt) : null);

	// One chart per reading kind: kinds with a protocol target first, then list order.
	const hasTarget = (kind: string) => !!snap?.body.targets.some((t) => t.kind === kind);
	const charts = $derived(
		READING_KINDS.map((k) => k.kind)
			.filter((kind) => data.readings.some((r) => r.kind === kind))
			.sort((a, c) => Number(hasTarget(c)) - Number(hasTarget(a)))
			.map((kind) => {
				const rows = data.readings.filter((r) => r.kind === kind);
				return {
					kind,
					label: readingKind(kind)?.label ?? kind,
					unit: rows[0].unit,
					points: rows,
					target: snap?.body.targets.find((t) => t.kind === kind)
				};
			})
	);
	const label = (kind: string) => readingKind(kind)?.label ?? kind;
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

{#if !finished}
	<a
		class="btn-primary mb-6 min-h-14 w-full text-lg"
		href={resolve('/batches/[id]/observe', { id: b.id })}>Add observation</a
	>
{/if}

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

{#if charts.length}
	<section class="mb-6">
		<h2 class="section-title">Readings</h2>
		<div class="space-y-3">
			{#each charts as c (c.kind)}
				<ReadingChart label={c.label} unit={c.unit} points={c.points} target={c.target} />
			{/each}
		</div>
	</section>
{/if}

<section class="mb-6">
	<h2 class="section-title">Timeline</h2>
	{#if data.observations.length === 0}
		<p class="empty">No observations yet.</p>
	{:else}
		<ol class="space-y-3">
			{#each data.observations as o (o.id)}
				<li class="card px-4 py-3">
					<p class="mb-1 flex justify-between text-sm text-gray-500">
						<span>
							{b.startedAt ? `Day ${dayNumber(b.startedAt, o.observedAt)} · ` : ''}{formatDateTime(
								o.observedAt
							)}
						</span>
						{#if o.phase}<span>{o.phase}</span>{/if}
					</p>
					{#if o.note}<p class="mb-2 whitespace-pre-line">{o.note}</p>{/if}
					{#if o.readings.length}
						<ul class="mb-2 flex flex-wrap gap-2">
							{#each o.readings as r (r.id)}
								<li class="rounded-full bg-gray-100 px-3 py-1 text-sm">
									{label(r.kind)} <strong>{r.value}</strong>
									{r.unit === label(r.kind) ? '' : r.unit}
								</li>
							{/each}
						</ul>
					{/if}
					{#if o.photos.length}
						<ul class="mb-2 grid grid-cols-3 gap-2">
							{#each o.photos as p (p.id)}
								<li>
									<!-- eslint-disable svelte/no-navigation-without-resolve -->
									<a href="{resolve('/')}photos/{p.path}" target="_blank" rel="noopener">
										<img
											src="{resolve('/')}photos/{p.path}"
											alt="Photo from {formatDateTime(o.observedAt)}"
											loading="lazy"
											class="aspect-square w-full rounded-lg object-cover"
										/>
									</a>
									<!-- eslint-enable svelte/no-navigation-without-resolve -->
								</li>
							{/each}
						</ul>
					{/if}
					<form
						method="POST"
						action="?/deleteObservation"
						use:enhance
						onsubmit={(e) => {
							if (!confirm('Delete this observation and its photos?')) e.preventDefault();
						}}
					>
						<input type="hidden" name="observationId" value={o.id} />
						<button class="text-sm text-gray-500 underline">Delete</button>
					</form>
				</li>
			{/each}
		</ol>
	{/if}
</section>

<a class="btn w-full" href={resolve('/batches/[id]/edit', { id: b.id })}>Edit batch details</a>
