<script lang="ts">
	import { untrack } from 'svelte';
	import { MAX_REPEAT_DAYS, pickerFor } from '#lib/recurrence.ts';
	import type { TaskTemplate } from '#lib/protocol-body.ts';

	/** `phases` is the fixed phase list of the batch type; when given, a task can belong to a phase (D26). */
	type Props = { tasks: TaskTemplate[]; phases?: readonly string[] };
	let { tasks, phases = [] }: Props = $props();

	// Each row is posted as task_<n>_<field>. Rows left without a name are ignored.
	type Row = {
		key: number;
		title: string;
		startDay: number | null;
		repeat: string;
		everyDays: number | null;
		endDay: number | null;
		phase: string;
	};
	let nextKey = 0;
	const toRow = (t: TaskTemplate): Row => {
		const p = pickerFor(t.recurrence);
		return {
			key: nextKey++,
			title: t.title,
			startDay: t.startDay,
			repeat: p.choice,
			everyDays: p.everyDays,
			endDay: t.endDay,
			phase: t.phase ?? ''
		};
	};
	const blank = (): Row => ({
		key: nextKey++,
		title: '',
		startDay: 1,
		repeat: '',
		everyDays: 3,
		endDay: null,
		phase: ''
	});
	// Starts from the saved list; edits after that live only in the form until it is saved.
	let rows = $state<Row[]>(untrack(() => tasks.map(toRow)));
</script>

<fieldset>
	<legend class="label">Tasks for each batch</legend>
	<p class="mb-2 text-sm text-gray-500">
		Added to every batch started from this protocol. Day 0 is the start day.{phases.length
			? ' A phase task starts when the batch enters its phase and stops when it leaves.'
			: ''}
	</p>
	<input type="hidden" name="taskCount" value={rows.length} />
	<div class="space-y-3">
		{#each rows as row, i (row.key)}
			<div class="card space-y-2 px-3 py-3">
				<div class="flex gap-2">
					<input
						class="input flex-1"
						name="task_{i}_title"
						placeholder={phases.length ? 'Mist and fan' : 'Top up airlock water'}
						aria-label="Task {i + 1} name"
						bind:value={row.title}
					/>
					<button
						type="button"
						class="btn px-3"
						aria-label="Remove task {i + 1}"
						onclick={() => rows.splice(i, 1)}>×</button
					>
				</div>
				<div class="grid grid-cols-2 gap-2">
					{#if phases.length}
						<label class="col-span-2 text-sm text-gray-600">
							When
							<select
								class="input mt-1"
								name="task_{i}_phase"
								bind:value={row.phase}
								onchange={() => {
									// "During fruiting" usually means from the day fruiting starts.
									if (row.phase && row.startDay === 1) row.startDay = 0;
								}}
							>
								<option value="">Counted from Day 0</option>
								{#each phases as ph (ph)}<option value={ph}>During {ph}</option>{/each}
							</select>
						</label>
					{/if}
					<label class="text-sm text-gray-600">
						{row.phase ? 'Days into the phase' : 'First day'}
						<input
							class="input mt-1"
							name="task_{i}_start"
							type="number"
							inputmode="numeric"
							min="0"
							bind:value={row.startDay}
						/>
					</label>
					<label class="text-sm text-gray-600">
						Repeat
						<select class="input mt-1" name="task_{i}_repeat" bind:value={row.repeat}>
							<option value="">Once</option>
							<option value="daily">Every day</option>
							<option value="weekly">Every week</option>
							<option value="every">Every few days</option>
						</select>
					</label>
					{#if row.repeat === 'every'}
						<label class="text-sm text-gray-600">
							Every how many days
							<input
								class="input mt-1"
								name="task_{i}_every"
								type="number"
								inputmode="numeric"
								min="2"
								max={MAX_REPEAT_DAYS}
								bind:value={row.everyDays}
							/>
						</label>
					{/if}
					{#if row.repeat && !row.phase}
						<label class="text-sm text-gray-600">
							Last day (optional)
							<input
								class="input mt-1"
								name="task_{i}_end"
								type="number"
								inputmode="numeric"
								min="0"
								bind:value={row.endDay}
							/>
						</label>
					{/if}
				</div>
			</div>
		{/each}
	</div>
	<button type="button" class="btn mt-2 w-full" onclick={() => rows.push(blank())}
		>Add a task</button
	>
</fieldset>
