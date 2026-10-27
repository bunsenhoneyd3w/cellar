<script lang="ts">
	import { resolve } from '$app/paths';
	import BatchForm from '#lib/components/BatchForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// Only the latest version of each protocol can start a batch.
	const preselect = $derived(
		data.protocols.find((p) => p.id === data.protocolId || p.familyId === data.protocolId)?.id
	);
</script>

<h1 class="mb-5 text-2xl font-bold">Start a ferment</h1>

{#if data.protocols.length === 0}
	<p class="empty">
		A batch follows a protocol.
		<a class="underline" href={resolve('/protocols/import')}>Import one from Paprika</a> first.
	</p>
{:else}
	<BatchForm
		values={{ protocolId: preselect, startedAt: data.startedAt, phase: 'primary ferment' }}
		protocols={data.protocols}
		nextNumber={data.nextNumber}
		spaces={data.spaces}
		equipment={data.equipment}
		error={form?.error}
		submitLabel="Start batch"
	/>
{/if}
