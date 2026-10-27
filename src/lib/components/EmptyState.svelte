<script lang="ts">
	import type { Component, Snippet } from 'svelte';

	// An empty screen as an invitation: what goes here, and the next step.
	type Props = {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		icon: Component<any>;
		title: string;
		children?: Snippet;
		actions?: Snippet;
	};
	let { icon: Icon, title, children, actions }: Props = $props();
</script>

<div
	class="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line-strong bg-card px-5 py-8 text-center"
>
	<Icon size={36} stroke={1.5} class="text-accent" aria-hidden="true" />
	<p class="font-serif text-lg">{title}</p>
	{#if children}<p class="max-w-xs text-sm text-ink-muted">{@render children()}</p>{/if}
	{#if actions}<div class="mt-2 flex flex-wrap justify-center gap-2">{@render actions()}</div>{/if}
</div>
