<script lang="ts">
	import { resolve } from '$app/paths';
	import TaskRow from '#lib/components/TaskRow.svelte';
	import UndoBar from '#lib/components/UndoBar.svelte';
	import { dayNumber, formatDate } from '#lib/time.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const t = $derived(data.tasks);
	const dueNow = $derived([...t.overdue, ...t.today]);
	const longDate = $derived(
		new Date(`${data.today}T12:00`).toLocaleDateString('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric'
		})
	);
	const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
	const summary = $derived.by(() => {
		if (dueNow.length === 0) return 'Nothing due today.';
		const parts = [];
		if (t.today.length) parts.push(`${plural(t.today.length, 'task')} due today`);
		if (t.overdue.length) parts.push(`${t.overdue.length} overdue`);
		return `${parts.join(', ')}.`;
	});
	const dueFor = (batchId: string) => dueNow.filter((x) => x.batchId === batchId).length;

	function lastSeen(iso: string | null) {
		if (!iso) return 'No observations yet';
		const d = dayNumber(iso);
		return d === 0 ? 'Checked today' : d === 1 ? 'Checked yesterday' : `Checked ${d} days ago`;
	}
</script>

<div class="mb-5 flex items-start justify-between gap-3">
	<div>
		<h1 class="text-2xl font-bold">Today</h1>
		<p class="text-gray-600">{longDate}</p>
	</div>
	<a class="btn shrink-0" href={resolve('/tasks/new')}>Add task</a>
</div>

{#if form?.error}<p class="error">{form.error}</p>{/if}

<p class="mb-5 text-lg font-medium">{summary}</p>

{#if t.overdue.length}
	<section class="mb-6">
		<h2 class="section-title text-red-700">Overdue</h2>
		<ul class="space-y-2">
			{#each t.overdue as task (task.id)}<TaskRow {task} from="today" />{/each}
		</ul>
	</section>
{/if}

{#if t.today.length}
	<section class="mb-6">
		<h2 class="section-title">Due today</h2>
		<ul class="space-y-2">
			{#each t.today as task (task.id)}<TaskRow {task} from="today" />{/each}
		</ul>
	</section>
{/if}

{#if t.upcoming.length}
	<section class="mb-6">
		<h2 class="section-title">Coming up this week</h2>
		<ul class="space-y-2">
			{#each t.upcoming as task (task.id)}<TaskRow {task} from="today" />{/each}
		</ul>
	</section>
{/if}

{#if t.undated.length}
	<section class="mb-6">
		<h2 class="section-title">Anytime</h2>
		<ul class="space-y-2">
			{#each t.undated as task (task.id)}<TaskRow {task} from="today" />{/each}
		</ul>
	</section>
{/if}

<section class="mb-6">
	<h2 class="section-title">Active batches</h2>
	{#if data.batches.length === 0}
		<p class="empty">
			No batches running.
			<a class="underline" href={resolve('/batches/new')}>Start a batch</a>
		</p>
	{:else}
		<ul class="space-y-2">
			{#each data.batches as b (b.id)}
				{@const due = dueFor(b.id)}
				<li>
					<a href={resolve('/batches/[id]', { id: b.id })} class="card block px-4 py-3">
						<span class="flex items-baseline justify-between gap-3">
							<span class="font-medium">{b.name}</span>
							<span class="shrink-0 text-sm text-gray-500">
								{b.status === 'planned'
									? `Starts ${formatDate(b.startedAt)}`
									: `Day ${b.startedAt ? dayNumber(b.startedAt) : 0}`}
							</span>
						</span>
						<span class="block text-sm text-gray-500">
							{b.phase ? `${b.phase} · ` : ''}{lastSeen(b.lastObservedAt)}{#if due}
								· <span class="font-medium text-gray-900">{plural(due, 'task')} due</span>{/if}
						</span>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<UndoBar done={form?.doneTask} />
