<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { INVENTORY_STATUSES, label } from '#lib/enums.ts';
	import { defaultUseBy } from '#lib/shelf.ts';
	import type { SpaceNode } from '#lib/server/spaces.ts';

	type Values = {
		name?: string;
		quantity?: number | null;
		unit?: string | null;
		spaceId?: string | null;
		packedAt?: string | null;
		useBy?: string | null;
		batchId?: string | null;
		status?: string;
	};
	/** `shelfLifeMonths` comes from the batch's protocol, when there is one (D30). */
	type Props = {
		values?: Values;
		spaces: SpaceNode[];
		shelfLifeMonths?: number | null;
		error?: string;
		submitLabel: string;
		/** A named form action, for pages that have more than one. */
		action?: string;
	};
	let { values = {}, spaces, shelfLifeMonths = null, error, submitLabel, action }: Props = $props();

	// Use-by follows the packed date until it is changed by hand.
	let quantity = $state(untrack(() => values.quantity ?? null));
	let packedAt = $state(untrack(() => values.packedAt ?? ''));
	let useBy = $state(untrack(() => values.useBy ?? ''));
	let useByTouched = $state(untrack(() => !!values.useBy && !shelfLifeMonths));
	function packedChanged() {
		if (useByTouched) return;
		useBy = defaultUseBy(packedAt, shelfLifeMonths) ?? useBy;
	}
</script>

<form method="POST" {action} use:enhance class="space-y-4">
	{#if error}<p class="error">{error}</p>{/if}
	{#if values.batchId}<input type="hidden" name="batchId" value={values.batchId} />{/if}

	<div>
		<label class="label" for="name">Name</label>
		<input
			class="input"
			id="name"
			name="name"
			required
			placeholder="Dill pickles, pint"
			value={values.name ?? ''}
		/>
	</div>

	<div class="grid grid-cols-[1fr_8rem] gap-3">
		<div>
			<label class="label" for="quantity">How many</label>
			<input
				class="input"
				id="quantity"
				name="quantity"
				type="number"
				step="any"
				min="0"
				inputmode="decimal"
				bind:value={quantity}
			/>
		</div>
		<div>
			<label class="label" for="unit">Unit</label>
			<input
				class="input"
				id="unit"
				name="unit"
				list="item-units"
				placeholder="jars"
				value={values.unit ?? ''}
			/>
			<datalist id="item-units">
				{#each ['jars', 'bags', 'bottles', 'lb', 'oz', 'g'] as u (u)}<option value={u}
					></option>{/each}
			</datalist>
		</div>
	</div>

	{#if quantity === null || (quantity as unknown) === ''}
		<div>
			<label class="label" for="status">Status</label>
			<select class="input" id="status" name="status" value={values.status ?? 'in_stock'}>
				{#each INVENTORY_STATUSES as s (s)}<option value={s}>{label(s)}</option>{/each}
			</select>
			<p class="mt-1 text-sm text-ink-muted">With a count, status follows it: low at 2 or fewer.</p>
		</div>
	{/if}

	<div>
		<label class="label" for="spaceId">Shelf</label>
		<select class="input" id="spaceId" name="spaceId" value={values.spaceId ?? ''}>
			<option value="">Not set</option>
			{#each spaces as s (s.id)}<option value={s.id}>{s.path}</option>{/each}
		</select>
	</div>

	<div class="grid grid-cols-2 gap-3">
		<div>
			<label class="label" for="packedAt">Packed</label>
			<input
				class="input"
				id="packedAt"
				name="packedAt"
				type="date"
				bind:value={packedAt}
				onchange={packedChanged}
			/>
		</div>
		<div>
			<label class="label" for="useBy">Use by</label>
			<input
				class="input"
				id="useBy"
				name="useBy"
				type="date"
				bind:value={useBy}
				oninput={() => (useByTouched = true)}
			/>
		</div>
	</div>
	{#if shelfLifeMonths}
		<p class="-mt-2 text-sm text-ink-muted">
			Use-by is {shelfLifeMonths} months after packing, from the protocol. Change it if you like.
		</p>
	{/if}

	<button class="btn-primary min-h-14 w-full text-lg">{submitLabel}</button>
</form>
