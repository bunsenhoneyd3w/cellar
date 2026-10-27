<script lang="ts">
	import type { TargetRange } from '#lib/protocol-body.ts';

	// One reading kind for up to four batches, lined up on days since each
	// batch's Day 0 (D39). Each batch has its own color and dash, and the list
	// under the chart names them in plain text, so color is never the only clue.

	type Point = { day: number; dayNumber: number; value: number };
	export type Series = { name: string; color: string; dash: string; points: Point[] };
	type Props = { label: string; unit: string; series: Series[]; target?: TargetRange };
	let { label, unit, series, target }: Props = $props();

	const W = 300;
	const H = 120;
	const PAD = 8;

	const all = $derived(series.flatMap((s) => s.points));
	const lastDay = $derived(Math.max(1, ...all.map((p) => p.day)));
	const domain = $derived.by(() => {
		const vals = all.map((p) => p.value);
		if (target?.min != null) vals.push(target.min);
		if (target?.max != null) vals.push(target.max);
		let lo = Math.min(...vals);
		let hi = Math.max(...vals);
		if (lo === hi) [lo, hi] = [lo - 1, hi + 1];
		const pad = (hi - lo) * 0.1;
		return { lo: lo - pad, hi: hi + pad };
	});

	const x = (day: number) => PAD + (Math.max(0, day) / lastDay) * (W - 2 * PAD);
	const y = (v: number) => H - PAD - ((v - domain.lo) / (domain.hi - domain.lo)) * (H - 2 * PAD);

	const band = $derived.by(() => {
		if (!target) return null;
		const top = y(target.max ?? domain.hi);
		return { top, height: y(target.min ?? domain.lo) - top };
	});
	const show = (unitText: string) => (unitText === label ? '' : ` ${unitText}`);
	const values = $derived(all.map((p) => p.value));
</script>

<figure class="card px-4 py-3">
	<figcaption class="mb-1 flex items-baseline justify-between">
		<span class="font-medium">{label}</span>
		<span class="text-sm text-gray-500">{unit === label ? '' : unit}</span>
	</figcaption>
	<svg
		viewBox="0 0 {W} {H}"
		class="h-auto w-full"
		role="img"
		aria-label="{label} by day for {series.map((s) => s.name).join(', ')}"
	>
		{#if band}
			<rect x="0" y={band.top} width={W} height={band.height} class="fill-gray-100" />
		{/if}
		<line x1={PAD} x2={W - PAD} y1={H - PAD} y2={H - PAD} class="stroke-gray-200" />
		{#each series as s, si (si)}
			{#if s.points.length > 1}
				<polyline
					points={s.points.map((p) => `${x(p.day)},${y(p.value)}`).join(' ')}
					fill="none"
					stroke={s.color}
					stroke-width="2"
					stroke-dasharray={s.dash || undefined}
					stroke-linejoin="round"
					stroke-linecap="round"
				/>
			{/if}
		{/each}
		{#each series as s, si (si)}
			{#each s.points as p, i (i)}
				<g>
					<title>{s.name}, day {p.dayNumber}: {p.value}{show(unit)}</title>
					<!-- Wide invisible hit area so a fingertip finds the point. -->
					<circle cx={x(p.day)} cy={y(p.value)} r="12" fill="transparent" />
					<circle
						cx={x(p.day)}
						cy={y(p.value)}
						r="4"
						fill={s.color}
						class="stroke-white"
						stroke-width="2"
					/>
				</g>
			{/each}
		{/each}
	</svg>
	<p class="flex justify-between text-xs text-gray-500">
		<span>Day 0</span>
		<span>Day {Math.round(lastDay)}</span>
	</p>
	<ul class="mt-2 space-y-1 text-sm">
		{#each series as s, si (si)}
			{@const last = s.points.at(-1)}
			<li class="flex items-center gap-2">
				<svg viewBox="0 0 24 8" class="h-2 w-6 shrink-0" aria-hidden="true">
					<line
						x1="1"
						x2="23"
						y1="4"
						y2="4"
						stroke={s.color}
						stroke-width="2.5"
						stroke-dasharray={s.dash || undefined}
					/>
				</svg>
				<span class="min-w-0 flex-1 truncate">{s.name}</span>
				<span class="shrink-0 text-gray-700">
					{#if last}
						{last.value}{show(unit)}
						<span class="text-gray-500">day {last.dayNumber}</span>
					{:else}
						<span class="text-gray-500">none</span>
					{/if}
				</span>
			</li>
		{/each}
	</ul>
	<p class="mt-1 flex justify-between text-xs text-gray-500">
		<span>
			{values.length} reading{values.length === 1 ? '' : 's'}{values.length > 1
				? ` · low ${Math.min(...values)}, high ${Math.max(...values)}`
				: ''}
		</span>
		{#if target}<span>Shaded: target range</span>{/if}
	</p>
</figure>
