<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import { resolve } from '$app/paths';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
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

<main class="mx-auto max-w-xl px-4 py-5">
	{@render children()}
</main>
