<script lang="ts">
	import { resolve } from '$app/paths';
	import CompareChart from '#lib/components/CompareChart.svelte';
	import { harvestWord, label } from '#lib/enums.ts';
	import { MAX_COMPARE, SERIES_STYLES } from '#lib/compare.ts';
	import { READING_KINDS, formatGermination, kindLabel } from '#lib/reading-kinds.ts';
	import { dayNumber, formatDate } from '#lib/time.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// "Tower 002 Lettuce and basil" is shown as "Tower 002" where space is short.
	const short = (name: string) => name.match(/^\S+ \d+/)?.[0] ?? name;
	const compareHref = (ids: string[]) =>
		`${resolve('/compare')}?${ids.map((id) => `b=${encodeURIComponent(id)}`).join('&')}`;

	// Picker: ticked boxes, capped at four.
	// svelte-ignore state_referenced_locally
	let chosen = $state<string[]>(data.mode === 'pick' ? data.ticked : []);

	const c = $derived(data.mode === 'compare' ? data.comparison : null);
	const type = $derived(c?.type ?? 'ferment');
	const styled = $derived(
		(c?.batches ?? []).map((b, i) => ({ ...b, style: SERIES_STYLES[i], short: short(b.name) }))
	);

	// One chart per reading kind any of them has: kinds with a shared target
	// first, as on the batch page, then the reading list's order.
	const charts = $derived(
		READING_KINDS.filter((k) => !k.harvest)
			.map((k) => k.kind)
			.filter((kind) => styled.some((b) => b.readings.some((r) => r.kind === kind)))
			.sort((a, z) => Number(!!c?.targets[z]) - Number(!!c?.targets[a]))
			.map((kind) => {
				const unit = styled.flatMap((b) => b.readings).find((r) => r.kind === kind)!.unit;
				return {
					kind,
					label: kindLabel(kind, type),
					unit,
					target: c?.targets[kind],
					series: styled.map((b) => ({
						name: b.short,
						color: b.style.color,
						dash: b.style.dash,
						// Only readings in the unit the chart is drawn in; units are never converted.
						points: b.readings.filter((r) => r.kind === kind && r.unit === unit)
					}))
				};
			})
	);

	type Row = { label: string; cells: string[] };
	const status = (b: (typeof styled)[number]) => {
		if (b.status === 'planned') return `Starts ${formatDate(b.startedAt)}`;
		if (b.status === 'active') return `Day ${b.days ?? 0}${b.phase ? `, ${b.phase}` : ''}`;
		return `${b.status === 'done' ? 'Done' : 'Failed'} after ${b.days ?? 0} days`;
	};
	const outcomeRows = $derived.by(() => {
		const rows: Row[] = [
			{ label: 'Status', cells: styled.map(status) },
			{
				label: 'Yield',
				cells: styled.map((b) =>
					b.outcome?.yieldValue != null
						? `${b.outcome.yieldValue} ${b.outcome.yieldUnit ?? ''}`
						: ''
				)
			},
			{
				label: 'Rating',
				cells: styled.map((b) => (b.outcome?.rating ? '★'.repeat(b.outcome.rating) : ''))
			},
			{
				label: label(harvestWord(type, 2)),
				cells: styled.map((b) =>
					b.harvests?.count
						? `${b.harvests.count} ${harvestWord(type, b.harvests.count)}, ${Math.round(b.harvests.grams * 10) / 10} g`
						: ''
				)
			},
			{
				label: 'Germination',
				cells: styled.map((b) => (b.germination ? formatGermination(b.germination) : ''))
			},
			{ label: 'What happened', cells: styled.map((b) => b.outcome?.summary ?? '') },
			{ label: 'Next time', cells: styled.map((b) => b.outcome?.wouldChange ?? '') }
		];
		return rows.filter((r) => r.cells.some(Boolean));
	});
</script>

<h1 class="mb-1 text-2xl font-bold">Compare</h1>

{#if data.mode === 'types'}
	<p class="mb-4 text-gray-600">Pick a kind of batch.</p>
	{#if data.types.length}
		<div class="grid grid-cols-2 gap-2">
			{#each data.types as t (t.type)}
				<a class="btn" href="{resolve('/compare')}?type={t.type}">{label(t.type)} ({t.count})</a>
			{/each}
		</div>
	{:else}
		<p class="empty">Comparing needs two batches of the same kind.</p>
	{/if}
{:else if data.mode === 'pick'}
	<p class="mb-4 text-gray-600">
		Pick 2 to {MAX_COMPARE}
		{label(data.type).toLowerCase()} batches. They line up by day since each one started.
	</p>
	{#if data.tooFew}<p class="error">Pick at least two batches of the same kind.</p>{/if}
	<form method="GET" action={resolve('/compare')}>
		{#each [true, false] as same (same)}
			{@const group = data.candidates.filter((b) => b.sameProtocol === same)}
			{#if group.length}
				<h2 class="section-title mt-4">
					{same ? 'Same protocol' : `Other ${label(data.type).toLowerCase()} batches`}
				</h2>
				<ul class="card divide-y divide-gray-100">
					{#each group as b (b.id)}
						{@const full = chosen.length >= MAX_COMPARE && !chosen.includes(b.id)}
						<li>
							<label
								class="flex min-h-14 items-center gap-3 px-4 py-2 {full ? 'text-gray-400' : ''}"
							>
								<input
									type="checkbox"
									name="b"
									value={b.id}
									bind:group={chosen}
									disabled={full}
									class="size-6 rounded border-gray-400"
								/>
								<span class="min-w-0 flex-1">
									<span class="block">{b.name}</span>
									<span class="block text-sm text-gray-500">
										{#if b.status === 'active' && b.startedAt}
											Day {dayNumber(b.startedAt)}{b.phase ? ` · ${b.phase}` : ''}
										{:else if b.status === 'planned'}
											Starts {formatDate(b.startedAt)}
										{:else}
											{b.status === 'done' ? 'Done' : 'Failed'} {formatDate(b.endedAt)}
										{/if}
										{b.protocolSnapshotJson ? ` · v${b.protocolSnapshotJson.version}` : ''}
									</span>
								</span>
							</label>
						</li>
					{/each}
				</ul>
			{/if}
		{/each}
		{#if data.candidates.length < 2}
			<p class="empty mt-4">There is only one {label(data.type).toLowerCase()} batch so far.</p>
		{/if}
		<div
			class="sticky z-10 -mx-4 mt-4 bg-gray-50/95 px-4 py-3"
			style="bottom: calc(3.5rem + env(safe-area-inset-bottom))"
		>
			<button class="btn-primary min-h-14 w-full text-lg" disabled={chosen.length < 2}>
				Compare {chosen.length || ''}
			</button>
		</div>
	</form>
{:else if c}
	<p class="mb-4 text-gray-600">
		{c.batches.length}
		{label(type).toLowerCase()} batches, lined up by day since each one started.
	</p>
	{#if c.leftOut}
		<p class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
			{c.leftOut} left out: only {MAX_COMPARE} batches of one kind fit.
		</p>
	{/if}

	<ul class="card mb-3 divide-y divide-gray-100">
		{#each styled as b (b.id)}
			<li>
				<a href={resolve('/batches/[id]', { id: b.id })} class="flex items-center gap-3 px-4 py-2">
					<svg viewBox="0 0 24 8" class="h-2 w-6 shrink-0" aria-hidden="true">
						<line
							x1="1"
							x2="23"
							y1="4"
							y2="4"
							stroke={b.style.color}
							stroke-width="2.5"
							stroke-dasharray={b.style.dash || undefined}
						/>
					</svg>
					<span class="min-w-0 flex-1">
						<span class="block">{b.name}</span>
						<span class="block text-sm text-gray-500">
							{status(b)}{b.protocol ? ` · ${b.protocol.name} v${b.protocol.version}` : ''}
						</span>
					</span>
				</a>
			</li>
		{/each}
	</ul>
	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
	<a class="btn mb-6 w-full" href="{compareHref(styled.map((b) => b.id))}&pick">Change batches</a>

	<section class="mb-6">
		<h2 class="section-title">Readings</h2>
		{#if charts.length}
			<div class="space-y-3">
				{#each charts as ch (ch.kind)}
					<CompareChart label={ch.label} unit={ch.unit} series={ch.series} target={ch.target} />
				{/each}
			</div>
		{:else}
			<p class="empty">No readings logged on these batches yet.</p>
		{/if}
	</section>

	{#snippet table(rows: Row[], caption: string)}
		<div class="card overflow-x-auto">
			<table class="w-full text-sm">
				<caption class="sr-only">{caption}</caption>
				<thead class="text-left text-gray-500">
					<tr>
						<th class="sticky left-0 bg-white px-3 py-2 font-normal">
							<span class="sr-only">Item</span>
						</th>
						{#each styled as b (b.id)}
							<th scope="col" class="min-w-28 px-3 py-2 align-bottom font-medium text-gray-800">
								<svg viewBox="0 0 24 8" class="mb-1 block h-2 w-6" aria-hidden="true">
									<line
										x1="1"
										x2="23"
										y1="4"
										y2="4"
										stroke={b.style.color}
										stroke-width="2.5"
										stroke-dasharray={b.style.dash || undefined}
									/>
								</svg>
								{b.short}
							</th>
						{/each}
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-100 border-t border-gray-100">
					{#each rows as r (r.label)}
						<tr>
							<!-- Row names stay put while three or four batches scroll sideways. -->
							<th
								scope="row"
								class="sticky left-0 bg-white px-3 py-2 text-left align-top font-normal text-gray-500"
							>
								{r.label}
							</th>
							{#each r.cells as cell, i (i)}
								<td class="px-3 py-2 align-top whitespace-pre-line">
									{#if cell}{cell}{:else}<span class="text-gray-400">-</span>{/if}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/snippet}

	<section class="mb-6">
		<h2 class="section-title">Outcome</h2>
		{@render table(outcomeRows, 'Outcome side by side')}
	</section>

	<section class="mb-6">
		<h2 class="section-title">Phases</h2>
		{#if c.phaseRows.length}
			{@render table(
				c.phaseRows.map((ph) => ({
					label: ph,
					cells: styled.map((b) => (b.phases[ph] != null ? `Day ${b.phases[ph]}` : ''))
				})),
				'Day each phase was reached'
			)}
			<p class="mt-1 text-sm text-gray-500">
				The day of the first check-in in each phase; the first phase counts from Day 0. A phase
				changed only on the edit screen does not show.
			</p>
		{:else}
			<p class="empty">No check-ins with a phase yet.</p>
		{/if}
	</section>
{/if}
