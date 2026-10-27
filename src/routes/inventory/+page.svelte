<script lang="ts">
	import { resolve } from '$app/paths';
	import ShelfItemRow from '#lib/components/ShelfItemRow.svelte';
	import UndoBar from '#lib/components/UndoBar.svelte';
	import type { ShelfItem } from '#lib/server/inventory.ts';
	import { useByState } from '#lib/shelf.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const stateOf = (i: ShelfItem) => useByState(i.useBy, data.today);

	// By shelf: one group per space path, items with no shelf last.
	const shelves = $derived.by(() => {
		const groups: Record<string, ShelfItem[]> = {};
		for (const i of data.items) (groups[i.spacePath ?? ''] ??= []).push(i);
		return Object.entries(groups)
			.sort(([a], [b]) => (!a ? 1 : !b ? -1 : a.localeCompare(b)))
			.map(([path, items]) => ({ title: path || 'No shelf', items }));
	});

	// By use-by: soonest first within each section.
	const sections = $derived.by(() => {
		const byDate = [...data.items].sort((a, b) => (a.useBy ?? '').localeCompare(b.useBy ?? ''));
		return [
			{ title: 'Past use-by', items: byDate.filter((i) => stateOf(i) === 'past') },
			{ title: 'Within 2 months', items: byDate.filter((i) => stateOf(i) === 'soon') },
			{ title: 'Later', items: byDate.filter((i) => stateOf(i) === 'ok') },
			{ title: 'No use-by', items: byDate.filter((i) => !i.useBy) }
		].filter((s) => s.items.length);
	});

	const groups = $derived(data.view === 'shelf' ? shelves : sections);
	const query = (view: string, gone: boolean) =>
		[view === 'use-by' ? 'view=use-by' : '', gone ? 'gone' : ''].filter(Boolean).join('&');
	const href = (view: string, gone: boolean) => {
		const q = query(view, gone);
		return `${resolve('/inventory')}${q ? `?${q}` : ''}`;
	};
	const undo = $derived(
		form && 'used' in form && form.used
			? {
					text: `Used one: ${form.used.name}`,
					action: '?/undoUse',
					fields: { itemId: form.used.id, before: form.used.before }
				}
			: null
	);
</script>

<div class="mb-4 flex items-center justify-between gap-3">
	<h1 class="text-2xl font-bold">Shelf</h1>
	<a class="btn" href={resolve('/inventory/new')}>Add item</a>
</div>

<div class="mb-5 grid grid-cols-2 gap-2" role="group" aria-label="Sort by">
	<!-- eslint-disable svelte/no-navigation-without-resolve -->
	{#each [['shelf', 'By shelf'], ['use-by', 'By use-by']] as [view, text] (view)}
		<a
			href={href(view, data.showGone)}
			aria-current={data.view === view ? 'page' : undefined}
			class="btn {data.view === view
				? 'border-gray-800 bg-gray-800 text-white active:bg-gray-700'
				: ''}">{text}</a
		>
	{/each}
	<!-- eslint-enable svelte/no-navigation-without-resolve -->
</div>

{#if form && 'error' in form && form.error}<p class="error">{form.error}</p>{/if}

{#if data.items.length === 0}
	<p class="empty">
		Nothing on the shelf yet. Finish a batch to add its jars, or add an item by hand.
	</p>
{:else}
	{#each groups as g (g.title)}
		<section class="mb-6">
			<h2 class="section-title">{g.title}</h2>
			<ul class="space-y-2">
				{#each g.items as item (item.id)}
					<ShelfItemRow {item} useBy={stateOf(item)} where={data.view === 'use-by'} />
				{/each}
			</ul>
		</section>
	{/each}
{/if}

<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
<a class="block py-3 text-center text-gray-600 underline" href={href(data.view, !data.showGone)}>
	{data.showGone ? 'Hide gone items' : 'Show gone items'}
</a>

<UndoBar {undo} />
