<script lang="ts">
	import { PRESERVE_METHOD_LABELS } from '#lib/enums.ts';
	import { bodyProcessing, formatHeadspace, type ProtocolBody } from '#lib/protocol-body.ts';

	/** Processing details of a preserve (D28), large enough to read at the canner. */
	type Props = { body: ProtocolBody };
	let { body }: Props = $props();

	const p = $derived(bodyProcessing(body));
	const pressure = $derived(p?.method === 'pressure');
	const timed = $derived(p?.jars.some((j) => j.minutes !== null || j.psi !== null) ?? false);
</script>

{#if p}
	<div class="card px-4 py-3">
		<p class="text-lg font-semibold">
			{p.method ? PRESERVE_METHOD_LABELS[p.method] : 'Method not set'}
		</p>
		{#if p.headspaceIn !== null || body.shelfLifeMonths}
			<p class="text-ink">
				{#if p.headspaceIn !== null}Headspace {formatHeadspace(p.headspaceIn)}.{/if}
				{#if body.shelfLifeMonths}Shelf life {body.shelfLifeMonths} months.{/if}
			</p>
		{/if}
		{#if p.jars.length}
			<table class="mt-2 w-full text-lg">
				{#if timed}
					<thead class="text-left text-sm text-ink-muted">
						<tr>
							<th class="py-1 font-normal">Jar</th>
							<th class="py-1 text-right font-normal">Minutes</th>
							{#if pressure}<th class="py-1 text-right font-normal">Psi</th>{/if}
						</tr>
					</thead>
				{/if}
				<tbody class="divide-y divide-line">
					{#each p.jars as j, i (i)}
						<tr>
							<td class="py-1">{j.size}</td>
							{#if timed}
								<td class="py-1 text-right font-semibold">{j.minutes ?? ''}</td>
								{#if pressure}<td class="py-1 text-right font-semibold">{j.psi ?? ''}</td>{/if}
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
{/if}
