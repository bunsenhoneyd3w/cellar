<script lang="ts">
	import { resolve } from '$app/paths';
	import ProtocolForm from '#lib/components/ProtocolForm.svelte';
	import { STARTABLE_TYPES, label } from '#lib/enums.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<h1 class="mb-4 text-2xl font-bold">New protocol</h1>

<div class="mb-5 grid grid-cols-2 gap-2" role="group" aria-label="Protocol for">
	{#each STARTABLE_TYPES as t (t)}
		<a
			href="{resolve('/protocols/new')}?type={t}"
			aria-current={data.batchType === t ? 'page' : undefined}
			class="btn {data.batchType === t
				? 'border-gray-800 bg-gray-800 text-white active:bg-gray-700'
				: ''}">{label(t)}</a
		>
	{/each}
</div>

{#key data.batchType}
	<ProtocolForm
		values={{ source: 'own' }}
		batchType={data.batchType}
		error={form?.error}
		submitLabel="Save protocol"
	/>
{/key}
