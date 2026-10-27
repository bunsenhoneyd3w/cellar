<script lang="ts">
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import ReadingChart from '#lib/components/ReadingChart.svelte';
	import TaskRow from '#lib/components/TaskRow.svelte';
	import UndoBar from '#lib/components/UndoBar.svelte';
	import ProcessingCard from '#lib/components/ProcessingCard.svelte';
	import { dayNumber, formatDate, formatDateTime } from '#lib/time.ts';
	import { CONTAMINATION_LABELS, harvestWord, label as titleCase } from '#lib/enums.ts';
	import {
		bodyProcessing,
		bodyTasks,
		bodyWords,
		formatRange,
		formatTemplate
	} from '#lib/protocol-body.ts';
	import { READING_KINDS, formatGermination, germination, kindLabel } from '#lib/reading-kinds.ts';
	import { formatCount } from '#lib/shelf.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const b = $derived(data.batch);
	const snap = $derived(b.protocolSnapshotJson);
	const finished = $derived(b.status === 'done' || b.status === 'failed');
	const day = $derived(b.startedAt ? dayNumber(b.startedAt, b.endedAt) : null);

	// One chart per reading kind: kinds with a protocol target first, then list order.
	// Harvest weights are left out; the flushes table shows them (D23).
	const hasTarget = (kind: string) => !!snap?.body.targets.some((t) => t.kind === kind);
	const charts = $derived(
		READING_KINDS.filter((k) => !k.harvest)
			.map((k) => k.kind)
			.filter((kind) => data.readings.some((r) => r.kind === kind))
			.sort((a, c) => Number(hasTarget(c)) - Number(hasTarget(a)))
			.map((kind) => {
				const rows = data.readings.filter((r) => r.kind === kind);
				const targets = snap?.body.targets.filter((t) => t.kind === kind) ?? [];
				// One band only when the target is the same in every phase; otherwise list them (D25).
				const single = targets.length === 1 && !targets[0].phase;
				return {
					kind,
					label: label(kind),
					unit: rows[0].unit,
					points: rows,
					target: single ? targets[0] : undefined,
					note: single
						? undefined
						: targets.map((t) => `${t.phase ?? 'other phases'}: ${formatRange(t)}`).join('; ')
				};
			})
	);
	const label = (kind: string) => kindLabel(kind, b.batchType);
	const words = $derived(bodyWords(b.batchType));
	// "flush" on a grow, "harvest" on a tower (D36).
	const cut = (n = 1) => harvestWord(b.batchType, n);
	const sprouts = $derived(germination(data.readings));
	const flushes = $derived(data.flushes.flushes);
	const events = $derived(
		data.observations
			.flatMap((o) => o.contaminations.map((c) => ({ ...c, observedAt: o.observedAt })))
			.reverse()
	);
	const tossed = $derived(!finished && events.at(-1)?.action === 'tossed');
	const grams = (n: number) => `${Math.round(n * 10) / 10} g`;
	const contamText = (c: { kind: string; severity: string; action: string }) =>
		[c.kind, c.severity, c.action].map((v) => CONTAMINATION_LABELS[v] ?? v).join(' · ');
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
	{#if flushes.length}
		· {flushes.length} {cut(flushes.length)}, {grams(data.flushes.totalGrams)}
	{/if}
	{#if sprouts}
		· {formatGermination(sprouts)}
	{/if}
</p>

{#if tossed}
	<p class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
		The last contamination was tossed.
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
		<a class="underline" href="{resolve('/batches/[id]/finish', { id: b.id })}?status=failed"
			>Finish this grow as failed</a
		>
	</p>
{/if}

{#if !finished}
	<a
		class="btn-primary mb-6 min-h-14 w-full text-lg"
		href={resolve('/batches/[id]/observe', { id: b.id })}>Add observation</a
	>
{/if}

{#if form?.error}<p class="error">{form.error}</p>{/if}

{#if !finished && snap && bodyProcessing(snap.body)}
	<!-- Up top while canning, so the time for each jar size is one glance away (D28). -->
	<section class="mb-6">
		<h2 class="section-title">Processing</h2>
		<ProcessingCard body={snap.body} />
	</section>
{/if}

{#if !finished}
	<section class="mb-6">
		<h2 class="section-title">Tasks</h2>
		{#if data.tasks.length}
			<ul class="mb-2 space-y-2">
				{#each data.tasks as task (task.id)}<TaskRow {task} from="batch" showBatch={false} />{/each}
			</ul>
		{/if}
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
		<a class="btn w-full" href={`${resolve('/tasks/new')}?batch=${b.id}&from=batch`}
			>Add task for this batch</a
		>
	</section>
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

{#if flushes.length}
	<section class="mb-6">
		<h2 class="section-title">{titleCase(cut(2))}</h2>
		<table class="card w-full text-sm">
			<thead class="text-left text-gray-500">
				<tr>
					<th class="px-4 py-2 font-normal">{titleCase(cut())}</th>
					<th class="px-2 py-2 font-normal">Picked</th>
					<th class="px-2 py-2 text-right font-normal">Weight</th>
					<th class="px-4 py-2 text-right font-normal">Total</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-100 border-t border-gray-100">
				{#each flushes as f, i (f.flush)}
					<tr>
						<td class="px-4 py-2 font-medium">{f.flush}</td>
						<td class="px-2 py-2">
							{b.startedAt
								? `Day ${dayNumber(b.startedAt, f.harvestedAt)}`
								: formatDate(f.harvestedAt)}
						</td>
						<td class="px-2 py-2 text-right">{grams(f.grams)}</td>
						<td class="px-4 py-2 text-right text-gray-600">
							{grams(flushes.slice(0, i + 1).reduce((sum, x) => sum + x.grams, 0))}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
		{#if data.flushes.skipped}
			<p class="mt-1 text-sm text-gray-500">
				{data.flushes.skipped} harvest reading{data.flushes.skipped === 1 ? '' : 's'} not in grams left
				out of the totals.
			</p>
		{/if}
	</section>
{/if}

{#if events.length}
	<section class="mb-6">
		<h2 class="section-title">Contamination</h2>
		<ul class="card divide-y divide-gray-100 text-sm">
			{#each events as c (c.id)}
				<li class="flex justify-between gap-3 px-4 py-2">
					<span>{contamText(c)}</span>
					<span class="shrink-0 text-gray-500">
						{b.startedAt ? `Day ${dayNumber(b.startedAt, c.observedAt)}` : formatDate(c.observedAt)}
					</span>
				</li>
			{/each}
		</ul>
	</section>
{/if}

{#if snap}
	<details class="card mb-6 px-4 py-3">
		<summary class="cursor-pointer font-medium">Method as started (v{snap.version})</summary>
		{#if finished && bodyProcessing(snap.body)}
			<div class="mt-4"><ProcessingCard body={snap.body} /></div>
		{/if}
		{#if snap.body.ingredients.length}
			<h3 class="section-title mt-4">{words.ingredients}</h3>
			<ul class="list-inside list-disc text-gray-700">
				{#each snap.body.ingredients as line, i (i)}<li>{line}</li>{/each}
			</ul>
		{/if}
		{#if snap.body.steps.length}
			<h3 class="section-title mt-4">{words.steps}</h3>
			<ol class="list-inside list-decimal text-gray-700">
				{#each snap.body.steps as line, i (i)}<li>{line}</li>{/each}
			</ol>
		{/if}
		{#if bodyTasks(snap.body).length}
			<h3 class="section-title mt-4">Tasks</h3>
			<ul class="text-gray-700">
				{#each bodyTasks(snap.body) as t, i (i)}
					<li>{t.title}: {formatTemplate(t)}</li>
				{/each}
			</ul>
		{/if}
		{#if snap.body.targets.length}
			<h3 class="section-title mt-4">Targets</h3>
			<ul class="text-gray-700">
				{#each snap.body.targets as t (`${t.kind}:${t.phase ?? ''}`)}
					<li>
						{kindLabel(t.kind, b.batchType)}{t.phase ? ` (${t.phase})` : ''}: {formatRange(t)}
					</li>
				{/each}
			</ul>
		{/if}
	</details>
{/if}

{#if finished}
	<section class="mb-6">
		<h2 class="section-title">Outcome</h2>
		<div class="card px-4 py-3">
			<p class="mb-2 flex justify-between">
				<span class="font-medium">{b.status === 'done' ? 'Done' : 'Failed'}</span>
				{#if data.outcome?.rating}
					<span aria-label="Rated {data.outcome.rating} of 5">
						{'★'.repeat(data.outcome.rating)}<span class="text-gray-300"
							>{'★'.repeat(5 - data.outcome.rating)}</span
						>
					</span>
				{/if}
			</p>
			{#if data.outcome?.yieldValue != null}
				<p class="mb-2 text-gray-700">Yield: {data.outcome.yieldValue} {data.outcome.yieldUnit}</p>
			{/if}
			{#if data.outcome?.summary}
				<p class="mb-2 whitespace-pre-line">{data.outcome.summary}</p>
			{/if}
			{#if data.outcome?.wouldChange}
				<p class="text-sm text-gray-500">Next time</p>
				<p class="whitespace-pre-line">{data.outcome.wouldChange}</p>
			{/if}
		</div>
	</section>
{/if}

{#if finished || data.shelfItems.length}
	<!-- What this batch put on the shelf (D29, D32); more can be added any time. -->
	<section class="mb-6">
		<h2 class="section-title">On the shelf</h2>
		{#if data.shelfItems.length}
			<ul class="card mb-2 divide-y divide-gray-100">
				{#each data.shelfItems as item (item.id)}
					<li>
						<a
							href={resolve('/inventory/[id]', { id: item.id })}
							class="flex justify-between gap-3 px-4 py-2"
						>
							<span>
								{item.name}
								<span class="block text-sm text-gray-500">{item.spacePath ?? 'No shelf'}</span>
							</span>
							<span class="shrink-0 text-right text-gray-700">
								{item.status === 'gone' ? 'Gone' : formatCount(item.quantity, item.unit)}
							</span>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
		<a class="btn w-full" href={`${resolve('/inventory/new')}?batch=${b.id}`}>Add to shelf</a>
	</section>
{/if}

{#if charts.length}
	<section class="mb-6">
		<h2 class="section-title">Readings</h2>
		<div class="space-y-3">
			{#each charts as c (c.kind)}
				<ReadingChart
					label={c.label}
					unit={c.unit}
					points={c.points}
					target={c.target}
					note={c.note || undefined}
				/>
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
					{#if o.flush || o.contaminations.length}
						<ul class="mb-2 flex flex-wrap gap-2">
							{#if o.flush}
								<li class="rounded-full bg-green-100 px-3 py-1 text-sm text-green-900">
									{titleCase(cut())}
									{o.flush}
								</li>
							{/if}
							{#each o.contaminations as c (c.id)}
								<li class="rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-900">
									{contamText(c)}
								</li>
							{/each}
						</ul>
					{/if}
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

<div class="grid grid-cols-2 gap-3">
	<a class="btn" href={resolve('/batches/[id]/edit', { id: b.id })}>Edit details</a>
	<a class="btn" href={resolve('/batches/[id]/finish', { id: b.id })}
		>{finished ? 'Edit outcome' : 'Finish batch'}</a
	>
</div>
{#if finished}
	<form method="POST" action="?/reopen" use:enhance class="mt-3">
		<button class="w-full py-2 text-sm text-gray-500 underline">Reopen this batch</button>
	</form>
{/if}

<UndoBar done={form?.doneTask} />
