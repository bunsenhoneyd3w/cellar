<script lang="ts">
	import { formatDateTime } from '#lib/time.ts';
	import type { TargetRange } from '#lib/protocol-body.ts';

	// One reading kind over time: a thin line, a dot per reading with a hover
	// tooltip, and the protocol's target range as a light band. No chart
	// library; it is a few lines of SVG.

	type Point = { takenAt: string; value: number };
	/** `note` replaces the band legend, e.g. when the target changes from phase to phase. */
	type Props = {
		label: string;
		unit: string;
		points: Point[];
		target?: TargetRange;
		note?: string;
	};
	let { label, unit, points, target, note }: Props = $props();

	const W = 300;
	const H = 80;
	const PAD = 8;

	const times = $derived(points.map((p) => new Date(p.takenAt).getTime()));
	const values = $derived(points.map((p) => p.value));
	const latest = $derived(points.at(-1));

	const domain = $derived.by(() => {
		const all = [...values];
		if (target?.min != null) all.push(target.min);
		if (target?.max != null) all.push(target.max);
		let lo = Math.min(...all);
		let hi = Math.max(...all);
		if (lo === hi) [lo, hi] = [lo - 1, hi + 1];
		const pad = (hi - lo) * 0.1;
		return { lo: lo - pad, hi: hi + pad };
	});
	const t0 = $derived(Math.min(...times));
	const t1 = $derived(Math.max(...times));

	const x = (t: number) => (t1 === t0 ? W / 2 : PAD + ((t - t0) / (t1 - t0)) * (W - 2 * PAD));
	const y = (v: number) => H - PAD - ((v - domain.lo) / (domain.hi - domain.lo)) * (H - 2 * PAD);

	const line = $derived(points.map((p, i) => `${x(times[i])},${y(p.value)}`).join(' '));
	const band = $derived.by(() => {
		if (!target) return null;
		const top = y(target.max ?? domain.hi);
		const bottom = y(target.min ?? domain.lo);
		return { top, height: bottom - top };
	});
</script>

<figure class="card px-4 py-3">
	<figcaption class="mb-1 flex items-baseline justify-between">
		<span class="font-medium">{label}</span>
		{#if latest}
			<span class="text-ink">{latest.value} {unit === label ? '' : unit}</span>
		{/if}
	</figcaption>
	<svg viewBox="0 0 {W} {H}" class="h-auto w-full" role="img" aria-label="{label} over time">
		{#if band}
			<rect x="0" y={band.top} width={W} height={band.height} class="fill-sunken" />
		{/if}
		{#if points.length > 1}
			<polyline
				points={line}
				fill="none"
				class="stroke-accent"
				stroke-width="2"
				stroke-linejoin="round"
				stroke-linecap="round"
			/>
		{/if}
		{#each points as p, i (i)}
			<g>
				<title>{p.value} {unit}, {formatDateTime(p.takenAt)}</title>
				<!-- Wide invisible hit area so a fingertip finds the point. -->
				<circle cx={x(times[i])} cy={y(p.value)} r="12" fill="transparent" />
				<circle
					cx={x(times[i])}
					cy={y(p.value)}
					r="4"
					class="fill-accent stroke-card"
					stroke-width="2"
				/>
			</g>
		{/each}
	</svg>
	<p class="mt-1 flex justify-between text-xs text-ink-muted">
		<span>
			{points.length} reading{points.length === 1 ? '' : 's'}{points.length > 1
				? ` · low ${Math.min(...values)}, high ${Math.max(...values)}`
				: ''}
		</span>
		{#if target}<span>Shaded: target range</span>{/if}
	</p>
	{#if note}<p class="mt-1 text-xs text-ink-muted">{note}</p>{/if}
</figure>
