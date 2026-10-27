<script lang="ts">
	import { resolve } from '$app/paths';
	import InventoryForm from '#lib/components/InventoryForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<h1 class="text-2xl font-bold">Edit item</h1>
<p class="mb-5 text-ink-muted">
	{#if data.batch}
		From <a class="underline" href={resolve('/batches/[id]', { id: data.batch.id })}
			>{data.batch.name}</a
		>
	{:else}
		Not made here
	{/if}
</p>

<InventoryForm
	values={data.item}
	spaces={data.spaces}
	shelfLifeMonths={data.shelfLifeMonths}
	error={form?.error}
	submitLabel="Save changes"
	action="?/save"
/>

<!-- A used-up item can stay as gone; delete is for an item added by mistake. -->
<form
	method="POST"
	action="?/delete"
	class="mt-4"
	onsubmit={(e) => {
		if (!confirm(`Delete ${data.item.name}?`)) e.preventDefault();
	}}
>
	<button class="w-full py-2 text-sm text-ink-muted underline">Delete item</button>
</form>
<p class="mt-4 text-xs text-ink-faint">{data.item.id}</p>
