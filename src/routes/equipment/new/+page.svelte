<script lang="ts">
	import EquipmentForm from '#lib/components/EquipmentForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<h1 class="mb-5 text-2xl font-bold">New equipment</h1>
<EquipmentForm spaces={data.spaces} error={form?.error} submitLabel="Save equipment" />
