<script lang="ts">
	import TypeIcon from './TypeIcon.svelte';
	import { BATCH_TYPE_LOOK, TYPE_CLASSES } from '#lib/batch-types.ts';
	import type { BatchType } from '#lib/enums.ts';

	let { type }: { type: BatchType } = $props();
</script>

<span
	class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium {TYPE_CLASSES[
		type
	]}"
>
	<TypeIcon {type} size={14} />
	{BATCH_TYPE_LOOK[type].word}
</span>
