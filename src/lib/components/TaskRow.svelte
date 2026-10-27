<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { formatDueDate, localDate } from '#lib/time.ts';
	import { formatRecurrence } from '#lib/recurrence.ts';
	import type { OpenTask } from '#lib/server/tasks.ts';

	type Props = { task: OpenTask; from: 'today' | 'batch'; showBatch?: boolean };
	let { task, from, showBatch = true }: Props = $props();

	// Done sits on the right, under the thumb, and is a full 56 px tall.
	let pending = $state(false);
	const today = localDate();
	const overdue = $derived(!!task.dueAt && task.dueAt < today);
	const repeat = $derived(formatRecurrence(task.recurrence));
	const editHref = $derived(`${resolve('/tasks/[id]', { id: task.id })}?from=${from}`);
</script>

<li class="card flex items-center gap-3 py-2 pr-2 pl-4">
	<div class="min-w-0 flex-1">
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
		<a href={editHref} class="block py-1 font-medium">{task.title}</a>
		<p class="text-sm text-gray-500">
			{#if task.dueAt}
				<span class={overdue ? 'font-medium text-red-700' : ''}>
					{formatDueDate(task.dueAt, today)}
				</span>
			{/if}
			{#if repeat}
				{#if task.dueAt}·{/if}
				{repeat}{task.phase ? ` while ${task.phase}` : ''}
			{/if}
			{#if showBatch && task.batchId}
				{#if task.dueAt || repeat}·{/if}
				<a class="underline" href={resolve('/batches/[id]', { id: task.batchId })}
					>{task.batchName}</a
				>
			{/if}
		</p>
	</div>
	<form
		method="POST"
		action="?/done"
		use:enhance={() => {
			pending = true;
			return async ({ update }) => {
				await update();
				pending = false;
			};
		}}
	>
		<input type="hidden" name="taskId" value={task.id} />
		<button
			class="min-h-14 min-w-20 rounded-full border-2 border-gray-800 px-4 text-base font-semibold text-gray-900 active:bg-gray-800 active:text-white disabled:opacity-50"
			disabled={pending}
			aria-label="Mark {task.title} done"
		>
			{pending ? '...' : 'Done'}
		</button>
	</form>
</li>
