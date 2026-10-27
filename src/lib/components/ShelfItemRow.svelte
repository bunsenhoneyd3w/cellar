<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { formatDay } from '#lib/time.ts';
	import { page } from '$app/state';
	import { actionWithQuery, formatCount } from '#lib/shelf.ts';
	import type { ShelfItem } from '#lib/server/inventory.ts';
	import type { UseByState } from '#lib/shelf.ts';

	/** `where` shows the shelf on the row, for the use-by view. */
	type Props = { item: ShelfItem; useBy: UseByState | null; where?: boolean };
	let { item, useBy, where = false }: Props = $props();

	let pending = $state(false);
	const gone = $derived(item.status === 'gone');
	const canUse = $derived(item.quantity !== null && item.quantity > 0);
</script>

<li class="card flex items-center gap-3 py-2 pr-2 pl-4 {gone ? 'opacity-60' : ''}">
	<div class="min-w-0 flex-1">
		<a href={resolve('/inventory/[id]', { id: item.id })} class="block py-1 font-medium"
			>{item.name}</a
		>
		<p class="text-sm text-gray-600">
			{#if item.quantity !== null}
				<span class="font-semibold text-gray-900">{formatCount(item.quantity, item.unit)}</span>
			{/if}
			{#if item.status === 'low'}
				<span class="rounded-full bg-amber-100 px-2 text-amber-900">Low</span>
			{:else if gone}
				<span class="rounded-full bg-gray-200 px-2">Gone</span>
			{/if}
			{#if where}
				<span class="text-gray-500">· {item.spacePath ?? 'No shelf'}</span>
			{/if}
		</p>
		{#if item.useBy}
			<p class="text-sm {useBy === 'past' ? 'font-medium text-red-700' : 'text-gray-500'}">
				{#if useBy === 'past'}
					Past use-by, {formatDay(item.useBy)}
				{:else}
					Use by {formatDay(item.useBy)}
					{#if useBy === 'soon'}
						<span class="rounded-full bg-amber-100 px-2 font-medium text-amber-900">Soon</span>
					{/if}
				{/if}
			</p>
		{/if}
	</div>
	{#if canUse}
		<form
			method="POST"
			action={actionWithQuery('use', page.url.search)}
			use:enhance={() => {
				pending = true;
				return async ({ update }) => {
					await update();
					pending = false;
				};
			}}
		>
			<input type="hidden" name="itemId" value={item.id} />
			<button
				class="min-h-14 min-w-24 rounded-full border-2 border-gray-800 px-3 text-base font-semibold text-gray-900 active:bg-gray-800 active:text-white disabled:opacity-50"
				disabled={pending}
				aria-label="Used one {item.name}"
			>
				{pending ? '...' : 'Used one'}
			</button>
		</form>
	{/if}
</li>
