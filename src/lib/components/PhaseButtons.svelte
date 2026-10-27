<script lang="ts">
	// The fixed phase list as big radio buttons (D27), so a phase is one tap
	// and always spelled the way phase tasks and targets expect.

	type Props = { phases: readonly string[]; value: string; name?: string };
	let { phases, value = $bindable(), name = 'phase' }: Props = $props();
	const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
</script>

<div class="grid grid-cols-2 gap-2">
	{#each phases as ph (ph)}
		<label
			class="btn min-h-12 cursor-pointer px-2 has-checked:border-accent has-checked:bg-accent has-checked:text-on-accent"
		>
			<input class="sr-only" type="radio" {name} value={ph} bind:group={value} />
			{sentence(ph)}
		</label>
	{/each}
</div>
