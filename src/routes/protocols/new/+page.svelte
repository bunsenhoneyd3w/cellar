<script lang="ts">
	import { resolve } from '$app/paths';
	import ProtocolForm from '#lib/components/ProtocolForm.svelte';
	import { STARTABLE_TYPES, label } from '#lib/enums.ts';
	import { SEAL_CHECK_TASK, emptyBody } from '#lib/protocol-body.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	// A new preserve starts with the seal check task (D33).
	const start = $derived(
		data.batchType === 'preserve' ? { ...emptyBody(), tasks: [SEAL_CHECK_TASK] } : undefined
	);
</script>

<h1 class="mb-4 text-2xl font-bold">New protocol</h1>

<div class="mb-5 grid grid-cols-3 gap-2" role="group" aria-label="Protocol for">
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
		values={{ source: 'own', bodyJson: start }}
		batchType={data.batchType}
		error={form?.error}
		submitLabel="Save protocol"
	/>
{/key}
