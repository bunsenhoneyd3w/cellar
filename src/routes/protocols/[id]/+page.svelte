<script lang="ts">
	import { resolve } from '$app/paths';
	import { formatDate } from '#lib/time.ts';
	import { label } from '#lib/enums.ts';
	import { kindLabel } from '#lib/reading-kinds.ts';
	import ProcessingCard from '#lib/components/ProcessingCard.svelte';
	import {
		bodyProcessing,
		bodyTasks,
		bodyWords,
		formatRange,
		formatTemplate
	} from '#lib/protocol-body.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const p = $derived(data.protocol);
	const body = $derived(p.bodyJson);
	const words = $derived(bodyWords(p.batchType));
</script>

<h1 class="text-2xl font-bold">{p.name}</h1>
<p class="mb-4 text-sm text-gray-500">
	{label(p.batchType)} · version {p.version} · saved {formatDate(p.createdAt)}{p.source
		? ` · ${p.source}`
		: ''}
</p>

{#if !data.isLatest}
	<p class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
		This is an older version.
		<a class="underline" href={resolve('/protocols/[id]', { id: data.versions[0].id })}
			>See version {data.versions[0].version}</a
		>
	</p>
{/if}

<div class="mb-6 grid grid-cols-2 gap-3">
	<a class="btn-primary" href="{resolve('/batches/new')}?protocol={data.versions[0].id}"
		>Start batch</a
	>
	<a class="btn" href={resolve('/protocols/[id]/edit', { id: data.versions[0].id })}>Edit</a>
</div>

{#if body.expectedDays || body.servings}
	<p class="mb-4 text-gray-700">
		{#if body.expectedDays}About {body.expectedDays} days.{/if}
		{#if body.servings}Makes {body.servings}.{/if}
	</p>
{/if}

{#if bodyProcessing(body)}
	<section class="mb-6">
		<h2 class="section-title">Processing</h2>
		<ProcessingCard {body} />
	</section>
{/if}

<section class="mb-6">
	<h2 class="section-title">{words.ingredients}</h2>
	{#if body.ingredients.length}
		<ul class="card divide-y divide-gray-100">
			{#each body.ingredients as line, i (i)}<li class="px-4 py-2">{line}</li>{/each}
		</ul>
	{:else}
		<p class="text-gray-500">None listed.</p>
	{/if}
</section>

<section class="mb-6">
	<h2 class="section-title">{words.steps}</h2>
	{#if body.steps.length}
		<ol class="card list-inside list-decimal divide-y divide-gray-100">
			{#each body.steps as line, i (i)}<li class="px-4 py-2">{line}</li>{/each}
		</ol>
	{:else}
		<p class="text-gray-500">None listed.</p>
	{/if}
</section>

{#if body.targets.length}
	<section class="mb-6">
		<h2 class="section-title">Target ranges</h2>
		<ul class="card divide-y divide-gray-100">
			{#each body.targets as t (`${t.kind}:${t.phase ?? ''}`)}
				<li class="flex justify-between gap-3 px-4 py-2">
					<span>
						{kindLabel(t.kind, p.batchType)}
						{#if t.phase}<span class="text-gray-500">· {t.phase}</span>{/if}
					</span>
					<span class="text-gray-700">{formatRange(t)}</span>
				</li>
			{/each}
		</ul>
	</section>
{/if}

{#if bodyTasks(body).length}
	<section class="mb-6">
		<h2 class="section-title">Tasks for each batch</h2>
		<ul class="card divide-y divide-gray-100">
			{#each bodyTasks(body) as t, i (i)}
				<li class="flex justify-between gap-3 px-4 py-2">
					<span>{t.title}</span>
					<span class="shrink-0 text-right text-gray-700">{formatTemplate(t)}</span>
				</li>
			{/each}
		</ul>
	</section>
{/if}

{#if p.notes || body.sourceUrl}
	<section class="mb-6">
		<h2 class="section-title">Notes</h2>
		{#if p.notes}<p class="whitespace-pre-line text-gray-700">{p.notes}</p>{/if}
		{#if body.sourceUrl}
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
			<a class="mt-2 block break-all text-gray-700 underline" href={body.sourceUrl} rel="external"
				>{body.sourceUrl}</a
			>
		{/if}
	</section>
{/if}

<section class="mb-6">
	<h2 class="section-title">Versions</h2>
	<ul class="card divide-y divide-gray-100">
		{#each data.versions as v (v.id)}
			<li>
				<a
					href={resolve('/protocols/[id]', { id: v.id })}
					class="flex justify-between px-4 py-2 {v.id === p.id ? 'font-semibold' : ''}"
				>
					<span>Version {v.version}</span>
					<span class="text-gray-500">{formatDate(v.createdAt)}</span>
				</a>
			</li>
		{/each}
	</ul>
</section>
