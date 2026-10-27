<script lang="ts">
	import InventoryForm from '#lib/components/InventoryForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<h1 class="text-2xl font-bold">Add to shelf</h1>
<p class="mb-5 text-gray-600">{data.batch ? `From ${data.batch.name}` : 'Not made here'}</p>

<InventoryForm
	values={data.values}
	spaces={data.spaces}
	shelfLifeMonths={data.shelfLifeMonths}
	error={form?.error}
	submitLabel="Add to shelf"
/>
