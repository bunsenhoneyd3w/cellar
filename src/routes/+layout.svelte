<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import IconSun from '@tabler/icons-svelte-runes/icons/sun';
	import IconFlask from '@tabler/icons-svelte-runes/icons/flask';
	import IconArchive from '@tabler/icons-svelte-runes/icons/archive';
	import IconBook from '@tabler/icons-svelte-runes/icons/book-2';
	import IconDots from '@tabler/icons-svelte-runes/icons/dots';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	// Bottom bar so the main places are under the thumb on a phone.
	const nav = [
		{ href: resolve('/'), label: 'Today', icon: IconSun, match: (p: string) => p === '/' },
		{
			href: resolve('/batches'),
			label: 'Batches',
			icon: IconFlask,
			match: (p: string) => p.startsWith('/batches')
		},
		{
			href: resolve('/inventory'),
			label: 'Shelf',
			icon: IconArchive,
			match: (p: string) => p.startsWith('/inventory')
		},
		{
			href: resolve('/protocols'),
			label: 'Protocols',
			icon: IconBook,
			match: (p: string) => p.startsWith('/protocols')
		},
		{
			href: resolve('/more'),
			label: 'More',
			icon: IconDots,
			match: (p: string) => p.startsWith('/more')
		}
	];
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Cellar</title>
</svelte:head>

<header class="border-b border-line bg-paper">
	<div class="mx-auto flex max-w-xl items-center px-4 pt-3 pb-2">
		<a href={resolve('/')} class="font-serif text-xl text-accent">Cellar</a>
	</div>
</header>

<main class="mx-auto max-w-xl px-4 pt-5 pb-28">
	{@render children()}
</main>

<nav
	class="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-card pb-[env(safe-area-inset-bottom)]"
>
	<div class="mx-auto flex max-w-xl">
		{#each nav as item (item.href)}
			{@const active = item.match(page.url.pathname)}
			<a
				href={item.href}
				class="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium {active
					? 'text-accent'
					: 'text-ink-muted'}"
				aria-current={active ? 'page' : undefined}
			>
				<item.icon size={22} stroke={active ? 2 : 1.5} aria-hidden="true" />
				{item.label}
			</a>
		{/each}
	</div>
</nav>
