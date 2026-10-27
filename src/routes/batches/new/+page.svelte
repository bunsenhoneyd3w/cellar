<script lang="ts">
	import IconBook from '@tabler/icons-svelte-runes/icons/book-2';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import { resolve } from '$app/paths';
	import BatchForm from '#lib/components/BatchForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// Only the latest version of each protocol can start a batch.
	const preselect = $derived(
		data.protocols.find((p) => p.id === data.protocolId || p.familyId === data.protocolId)?.id
	);
</script>

<h1 class="mb-5 text-2xl font-bold">Start a batch</h1>

{#if data.protocols.length === 0}
	<EmptyState icon={IconBook} title="First, a protocol">
		A batch follows a protocol, so it starts with the method you'll use.
		{#snippet actions()}
			<a class="btn-primary" href={resolve('/protocols/import')}>Import from Paprika</a>
			<a class="btn" href={resolve('/protocols/new')}>Write one</a>
		{/snippet}
	</EmptyState>
{:else}
	<BatchForm
		values={{ protocolId: preselect, startedAt: data.startedAt }}
		protocols={data.protocols}
		nextNumbers={data.nextNumbers}
		spaces={data.spaces}
		equipment={data.equipment}
		error={form?.error}
		submitLabel="Start batch"
	/>
{/if}
