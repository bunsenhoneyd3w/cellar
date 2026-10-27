<script lang="ts">
	import BatchForm from '#lib/components/BatchForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<h1 class="mb-5 text-2xl font-bold">Edit batch</h1>
<BatchForm
	values={{ ...data.batch, equipmentIds: data.equipmentIds, startedAt: data.startedAt }}
	spaces={data.spaces}
	equipment={data.equipment}
	error={form?.error}
	submitLabel="Save changes"
/>
