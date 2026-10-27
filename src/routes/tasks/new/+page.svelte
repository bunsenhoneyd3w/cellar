<script lang="ts">
	import TaskForm from '#lib/components/TaskForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<h1 class="mb-5 text-2xl font-bold">New task</h1>
<TaskForm
	values={{ batchId: data.batchId, dueAt: data.today }}
	batches={data.batches}
	from={data.from}
	error={form?.error}
	submitLabel="Add task"
/>
