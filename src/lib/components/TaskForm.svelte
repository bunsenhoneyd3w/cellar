<script lang="ts">
	import { enhance } from '$app/forms';
	import { addDays, localDate } from '#lib/time.ts';
	import { MAX_REPEAT_DAYS, pickerFor } from '#lib/recurrence.ts';

	type Values = {
		title?: string;
		batchId?: string | null;
		dueAt?: string | null;
		recurrence?: string | null;
		repeatUntil?: string | null;
	};
	type Props = {
		values?: Values;
		batches: { id: string; name: string }[];
		from: string;
		error?: string;
		submitLabel: string;
	};
	let { values = {}, batches, from, error, submitLabel }: Props = $props();

	const today = localDate();
	const initial = () => ({ due: values.dueAt ?? '', ...pickerFor(values.recurrence) });
	let dueAt = $state(initial().due);
	let repeat = $state(initial().choice);
	let everyDays = $state(initial().everyDays ?? 3);

	// One tap for the usual due dates instead of a fiddly date picker.
	const quick = [
		{ label: 'Today', value: today },
		{ label: 'Tomorrow', value: addDays(today, 1) },
		{ label: 'In a week', value: addDays(today, 7) },
		{ label: 'No date', value: '' }
	];
</script>

<form method="POST" action="?/save" use:enhance class="space-y-5">
	{#if error}<p class="error">{error}</p>{/if}
	<input type="hidden" name="from" value={from} />

	<div>
		<label class="label" for="title">Task</label>
		<input
			class="input"
			id="title"
			name="title"
			required
			autocomplete="off"
			enterkeyhint="done"
			placeholder="Top up airlock water"
			value={values.title ?? ''}
		/>
	</div>

	<div>
		<label class="label" for="batchId">Batch</label>
		<select class="input" id="batchId" name="batchId" value={values.batchId ?? ''}>
			<option value="">None (general task)</option>
			{#each batches as b (b.id)}<option value={b.id}>{b.name}</option>{/each}
		</select>
	</div>

	<fieldset>
		<legend class="label">Due</legend>
		<div class="mb-2 grid grid-cols-4 gap-2">
			{#each quick as q (q.label)}
				<button
					type="button"
					class="min-h-12 rounded-lg border px-1 text-sm font-medium {dueAt === q.value
						? 'border-gray-800 bg-gray-800 text-white'
						: 'border-gray-300 bg-white text-gray-800'}"
					aria-pressed={dueAt === q.value}
					onclick={() => (dueAt = q.value)}>{q.label}</button
				>
			{/each}
		</div>
		<input class="input" name="dueAt" type="date" aria-label="Due date" bind:value={dueAt} />
	</fieldset>

	<div>
		<label class="label" for="repeat">Repeat</label>
		<select
			class="input"
			id="repeat"
			name="repeat"
			bind:value={repeat}
			onchange={() => {
				if (repeat && !dueAt) dueAt = today;
			}}
		>
			<option value="">Does not repeat</option>
			<option value="daily">Every day</option>
			<option value="weekly">Every week</option>
			<option value="every">Every few days</option>
		</select>
	</div>

	{#if repeat === 'every'}
		<div>
			<label class="label" for="everyDays">Every how many days</label>
			<input
				class="input"
				id="everyDays"
				name="everyDays"
				type="number"
				inputmode="numeric"
				min="2"
				max={MAX_REPEAT_DAYS}
				bind:value={everyDays}
			/>
		</div>
	{/if}

	{#if repeat}
		<div>
			<label class="label" for="repeatUntil">Stop repeating after</label>
			<input
				class="input"
				id="repeatUntil"
				name="repeatUntil"
				type="date"
				value={values.repeatUntil ?? ''}
			/>
			<p class="mt-1 text-sm text-gray-500">
				Optional. Leave empty to keep repeating until the batch is finished or you delete the task.
			</p>
		</div>
	{/if}

	<button class="btn-primary min-h-14 w-full text-lg">{submitLabel}</button>
</form>
