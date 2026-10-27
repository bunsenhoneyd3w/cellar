<script lang="ts">
	import { resolve } from '$app/paths';

	const links = [
		{ href: resolve('/spaces'), label: 'Spaces', hint: 'Rooms, shelves, bins, appliances' },
		{ href: resolve('/equipment'), label: 'Equipment', hint: 'Crocks, airlocks, meters, canners' },
		{ href: resolve('/settings'), label: 'Settings', hint: 'Backup and export' }
	];
</script>

<h1 class="mb-5 text-2xl font-bold">More</h1>

<ul class="card divide-y divide-line">
	{#each links as link (link.href)}
		<li>
			<a href={link.href} class="block px-4 py-3">
				<span class="block font-medium">{link.label}</span>
				<span class="block text-sm text-ink-muted">{link.hint}</span>
			</a>
		</li>
	{/each}
</ul>
