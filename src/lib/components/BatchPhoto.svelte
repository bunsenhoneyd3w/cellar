<script lang="ts">
	import { resolve } from '$app/paths';
	import TypeIcon from './TypeIcon.svelte';
	import { TYPE_CLASSES } from '#lib/batch-types.ts';
	import type { BatchType } from '#lib/enums.ts';

	// The batch's latest photo, or its type icon on a tinted square when there is none yet.
	type Props = { type: BatchType; path: string | null; class?: string; iconSize?: number };
	let { type, path, class: cls = '', iconSize = 28 }: Props = $props();
</script>

{#if path}
	<img src="{resolve('/')}photos/{path}" alt="" loading="lazy" class="object-cover {cls}" />
{:else}
	<span class="flex items-center justify-center {TYPE_CLASSES[type]} {cls}">
		<TypeIcon {type} size={iconSize} />
	</span>
{/if}
