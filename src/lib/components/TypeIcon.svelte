<script lang="ts">
	import IconBottle from '@tabler/icons-svelte-runes/icons/bottle';
	import IconMushroom from '@tabler/icons-svelte-runes/icons/mushroom';
	import IconPlant from '@tabler/icons-svelte-runes/icons/plant-2';
	import IconSeedling from '@tabler/icons-svelte-runes/icons/seedling';
	import IconContainer from '@tabler/icons-svelte-runes/icons/container';
	import { BATCH_TYPE_LOOK } from '#lib/batch-types.ts';
	import type { BatchType } from '#lib/enums.ts';

	let { type, size = 16 }: { type: BatchType; size?: number } = $props();

	const ICONS = {
		bottle: IconBottle,
		mushroom: IconMushroom,
		'plant-2': IconPlant,
		seedling: IconSeedling,
		container: IconContainer
	};
	const Icon = $derived(ICONS[BATCH_TYPE_LOOK[type].icon]);
</script>

<Icon {size} stroke={1.75} aria-hidden="true" />
