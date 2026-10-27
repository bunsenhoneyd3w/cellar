<script lang="ts">
	import IconFlask from '@tabler/icons-svelte-runes/icons/flask';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import { resolve } from '$app/paths';
	import BatchPhoto from '#lib/components/BatchPhoto.svelte';
	import TypeChip from '#lib/components/TypeChip.svelte';
	import { BATCH_TYPE_LOOK } from '#lib/batch-types.ts';
	import { dayNumber, formatDate } from '#lib/time.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const tabs = [
		{ key: 'active', label: 'Active' },
		{ key: 'finished', label: 'Finished' },
		{ key: 'all', label: 'All' }
	];

	/** This list's address with one filter changed; the others are kept. */
	function href(change: Record<string, string | null>) {
		const next = { show: data.show, type: data.type, space: data.space, ...change };
		const qs = Object.entries(next)
			.filter(([k, v]) => v && !(k === 'show' && v === 'active'))
			.map(([k, v]) => `${k}=${encodeURIComponent(v as string)}`)
			.join('&');
		return `${resolve('/batches')}${qs ? `?${qs}` : ''}`;
	}
</script>

<div class="mb-4 flex items-center justify-between">
	<h1 class="text-2xl font-bold">Batches</h1>
	<a class="btn-primary" href={resolve('/batches/new')}>Start batch</a>
</div>

<!-- eslint-disable svelte/no-navigation-without-resolve -->
<div class="mb-3 grid grid-cols-3 gap-2">
	{#each tabs as t (t.key)}
		<a
			href={href({ show: t.key })}
			class="btn {data.show === t.key
				? 'border-accent bg-accent text-on-accent active:bg-accent-strong'
				: ''}">{t.label}</a
		>
	{/each}
</div>

{#if data.types.length > 1}
	<div class="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
		<a
			href={href({ type: null })}
			class="btn min-h-10 shrink-0 px-3 text-sm {data.type ? '' : 'border-accent text-accent'}"
			>Every kind</a
		>
		{#each data.types as t (t)}
			<a
				href={href({ type: t })}
				class="btn min-h-10 shrink-0 px-3 text-sm {data.type === t
					? 'border-accent text-accent'
					: ''}">{BATCH_TYPE_LOOK[t].word}</a
			>
		{/each}
	</div>
{/if}
<!-- eslint-enable svelte/no-navigation-without-resolve -->

{#if data.spaces.length}
	<!-- A plain GET form, so the place filter works even before the page's script loads. -->
	<form method="GET" action={resolve('/batches')} class="mb-4">
		{#if data.show !== 'active'}<input type="hidden" name="show" value={data.show} />{/if}
		{#if data.type}<input type="hidden" name="type" value={data.type} />{/if}
		<label>
			<span class="sr-only">Where</span>
			<select
				class="input"
				name="space"
				value={data.space ?? ''}
				onchange={(e) => e.currentTarget.form?.requestSubmit()}
			>
				<option value="">Everywhere</option>
				{#each data.spaces as s (s.id)}<option value={s.id}>{s.path}</option>{/each}
			</select>
		</label>
	</form>
{/if}

{#if data.batches.length === 0}
	<EmptyState icon={IconFlask} title="No batches here">
		{data.type || data.space
			? 'Try another kind or place.'
			: data.show === 'finished'
				? 'Finished batches show up here with how they turned out.'
				: 'Start one from a protocol.'}
	</EmptyState>
{:else}
	<ul class="card divide-y divide-line">
		{#each data.batches as b (b.id)}
			<li>
				<a
					href={resolve('/batches/[id]', { id: b.id })}
					class="flex items-center gap-3 px-3 py-2.5 active:bg-sunken"
				>
					<BatchPhoto
						type={b.batchType}
						path={b.latestPhotoPath}
						class="size-14 shrink-0 rounded-lg"
						iconSize={24}
					/>
					<span class="min-w-0 flex-1">
						<TypeChip type={b.batchType} />
						<span class="mt-0.5 block font-medium">{b.name}</span>
						<span class="block text-sm text-ink-muted">
							{#if b.status === 'active' && b.startedAt}
								Day {dayNumber(b.startedAt)}{b.phase ? ` · ${b.phase}` : ''}
							{:else if b.status === 'planned'}
								Starts {formatDate(b.startedAt)}
							{:else}
								{b.status === 'done' ? 'Done' : 'Failed'} {formatDate(b.endedAt)}
							{/if}
							{b.spaceName ? ` · ${b.spaceName}` : ''}
						</span>
					</span>
				</a>
			</li>
		{/each}
	</ul>
	<a class="mt-4 block py-2 text-center text-ink-muted underline" href={resolve('/compare')}
		>Compare batches</a
	>
{/if}
