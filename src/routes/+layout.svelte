<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	// Bottom bar so the main places are under the thumb on a phone.
	const nav = [
		{ href: resolve('/'), label: 'Today', match: (p: string) => p === '/' },
		{
			href: resolve('/batches'),
			label: 'Batches',
			match: (p: string) => p.startsWith('/batches')
		},
		{
			href: resolve('/protocols'),
			label: 'Protocols',
			match: (p: string) => p.startsWith('/protocols')
		},
		{ href: resolve('/more'), label: 'More', match: (p: string) => p.startsWith('/more') }
	];
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Cellar</title>
</svelte:head>

<header class="bg-gray-800 text-white">
	<div class="mx-auto flex max-w-xl items-center px-4 py-3">
		<a href={resolve('/')} class="text-lg font-semibold tracking-wide">Cellar</a>
	</div>
</header>

<main class="mx-auto max-w-xl px-4 pt-5 pb-28">
	{@render children()}
</main>

<nav
	class="fixed inset-x-0 bottom-0 z-10 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]"
>
	<div class="mx-auto flex max-w-xl">
		{#each nav as item (item.href)}
			<a
				href={item.href}
				class="flex min-h-14 flex-1 items-center justify-center text-sm font-medium {item.match(
					page.url.pathname
				)
					? 'text-gray-900'
					: 'text-gray-500'}"
				aria-current={item.match(page.url.pathname) ? 'page' : undefined}
			>
				{item.label}
			</a>
		{/each}
	</div>
</nav>
