<script lang="ts">
	// The fixed phase list as big radio buttons (D27), so a phase is one tap
	// and always spelled the way phase tasks and targets expect.

	type Props = { phases: readonly string[]; value: string; name?: string };
	let { phases, value = $bindable(), name = 'phase' }: Props = $props();
</script>

<div class="grid grid-cols-2 gap-2">
	{#each phases as ph (ph)}
		<label
			class="btn min-h-12 cursor-pointer px-2 capitalize has-checked:border-gray-800 has-checked:bg-gray-800 has-checked:text-white"
		>
			<input class="sr-only" type="radio" {name} value={ph} bind:group={value} />
			{ph}
		</label>
	{/each}
</div>
