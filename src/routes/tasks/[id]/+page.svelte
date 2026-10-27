<script lang="ts">
	import TaskForm from '#lib/components/TaskForm.svelte';
	import { formatDateTime } from '#lib/time.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<h1 class="mb-5 text-2xl font-bold">Edit task</h1>
{#if data.task.doneAt}
	<p class="mb-4 rounded-lg bg-sunken px-4 py-3 text-ink">
		Done {formatDateTime(data.task.doneAt)}
	</p>
{/if}
<TaskForm
	values={data.task}
	batches={data.batches}
	from={data.from}
	error={form?.error}
	submitLabel="Save changes"
/>

<form
	method="POST"
	action="?/delete"
	class="mt-4"
	onsubmit={(e) => {
		if (!confirm('Delete this task?')) e.preventDefault();
	}}
>
	<input type="hidden" name="from" value={data.from} />
	<button class="w-full py-2 text-sm text-ink-muted underline">Delete task</button>
</form>
<p class="mt-4 text-xs text-ink-faint">{data.task.id}</p>
