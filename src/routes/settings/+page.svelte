<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const exportUrl = (file: string) => `${resolve('/settings')}/export/${file}`;
</script>

<h1 class="mb-5 text-2xl font-bold">Settings</h1>

<section class="mb-6">
	<h2 class="section-title">Backup</h2>
	<div class="card space-y-3 px-4 py-3 text-sm">
		<p>
			Cellar keeps everything in two places. Copy both and you have a complete backup. Copy the
			database while the app is stopped, or copy the files ending in <code>-wal</code> and
			<code>-shm</code> next to it as well.
		</p>
		<div>
			<p class="text-gray-500">Database file</p>
			<p class="font-mono break-all">{data.dbFile}</p>
		</div>
		<div>
			<p class="text-gray-500">Photos folder</p>
			<p class="font-mono break-all">{data.photosDir}</p>
		</div>
	</div>
</section>

<section class="mb-6">
	<h2 class="section-title">Export</h2>
	<!-- eslint-disable svelte/no-navigation-without-resolve -->
	<a class="btn-primary mb-3 w-full" href={exportUrl('all.json')} download>
		Everything as one JSON file
	</a>
	<ul class="card divide-y divide-gray-100">
		{#each data.tables as t (t.name)}
			<li class="flex items-center gap-2 px-4 py-2">
				<span class="flex-1">
					<span class="block font-mono text-sm">{t.name}</span>
					<span class="block text-xs text-gray-500">{t.count} row{t.count === 1 ? '' : 's'}</span>
				</span>
				<a class="btn min-h-10 px-3 text-sm" href={exportUrl(`${t.name}.csv`)} download>CSV</a>
				<a class="btn min-h-10 px-3 text-sm" href={exportUrl(`${t.name}.json`)} download>JSON</a>
			</li>
		{/each}
	</ul>
	<!-- eslint-enable svelte/no-navigation-without-resolve -->
</section>
