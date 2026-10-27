<script lang="ts">
	import { untrack } from 'svelte';
	import type { SpaceNode } from '#lib/server/spaces.ts';

	type ShelfRowValues = { name: string; unit: string; useBy: string | null };
	/** "Add to shelf" rows on the finish screen (D29): one per jar size or per shelf. */
	type Props = { rows: ShelfRowValues[]; spaces: SpaceNode[] };
	let { rows: start, spaces }: Props = $props();

	// Each row is posted as shelf_<n>_<field>. Rows left without a count are ignored.
	type Row = ShelfRowValues & { key: number; spaceId: string };
	let nextKey = 0;
	let rows = $state<Row[]>(
		untrack(() => start.map((r) => ({ ...r, key: nextKey++, spaceId: '' })))
	);
	// A new row copies the one above, so a second shelf of the same jars is quick.
	function addRow() {
		const last = rows.at(-1);
		rows.push({
			key: nextKey++,
			name: last?.name ?? '',
			unit: last?.unit ?? 'jars',
			useBy: last?.useBy ?? null,
			spaceId: ''
		});
	}
</script>

<input type="hidden" name="shelfCount" value={rows.length} />
<div class="space-y-3">
	{#each rows as row, i (row.key)}
		<div class="card space-y-2 px-3 py-3">
			<div class="flex gap-2">
				<input
					class="input flex-1"
					name="shelf_{i}_name"
					aria-label="Item {i + 1} name"
					bind:value={row.name}
				/>
				<button
					type="button"
					class="btn px-3"
					aria-label="Remove item {i + 1}"
					onclick={() => rows.splice(i, 1)}>×</button
				>
			</div>
			<div class="grid grid-cols-2 gap-2">
				<label class="text-sm text-gray-600">
					How many
					<input
						class="input mt-1"
						name="shelf_{i}_quantity"
						type="number"
						step="any"
						min="0"
						inputmode="decimal"
					/>
				</label>
				<label class="text-sm text-gray-600">
					Unit
					<input class="input mt-1" name="shelf_{i}_unit" bind:value={row.unit} />
				</label>
				<label class="text-sm text-gray-600">
					Shelf
					<select class="input mt-1" name="shelf_{i}_spaceId" bind:value={row.spaceId}>
						<option value="">Not set</option>
						{#each spaces as s (s.id)}<option value={s.id}>{s.path}</option>{/each}
					</select>
				</label>
				<label class="text-sm text-gray-600">
					Use by
					<input class="input mt-1" name="shelf_{i}_useBy" type="date" bind:value={row.useBy} />
				</label>
			</div>
		</div>
	{/each}
</div>
<button type="button" class="btn mt-2 w-full" onclick={addRow}>Add another row</button>
