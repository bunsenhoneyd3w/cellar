<script lang="ts">
	import EquipmentForm from '#lib/components/EquipmentForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<h1 class="mb-5 text-2xl font-bold">Edit equipment</h1>
<EquipmentForm
	values={{ ...data.item, specsText: data.specsText }}
	spaces={data.spaces}
	error={form?.error}
	submitLabel="Save changes"
/>
<p class="mt-4 text-xs text-gray-400">{data.item.id}</p>
