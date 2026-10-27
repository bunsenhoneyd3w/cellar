<script lang="ts">
	import { enhance } from '$app/forms';

	/** What Undo posts: the text shown, the form action, and its hidden fields. */
	type Undo = { text: string; action: string; fields: Record<string, string | number> };
	type Done = { id: string; title: string };
	/** `done` is a task just ticked off; `undo` is anything else, such as a jar just used. */
	type Props = { done?: Done | null; undo?: Undo | null };
	let { done, undo }: Props = $props();

	const offered = $derived<Undo | null>(
		undo ??
			(done ? { text: `Done: ${done.title}`, action: '?/undo', fields: { taskId: done.id } } : null)
	);

	// After a Done, offer Undo for a few seconds in case the wrong row was tapped.
	let shown = $state<Undo | null>(null);
	$effect(() => {
		shown = offered;
		if (!offered) return;
		const timer = setTimeout(() => (shown = null), 6000);
		return () => clearTimeout(timer);
	});
</script>

{#if shown}
	<div
		class="fixed inset-x-0 z-20 px-4"
		style="bottom: calc(4rem + env(safe-area-inset-bottom))"
		role="status"
	>
		<div
			class="mx-auto flex max-w-xl items-center gap-3 rounded-lg bg-gray-900 py-1 pr-1 pl-4 text-white shadow-lg"
		>
			<span class="min-w-0 flex-1 truncate">{shown.text}</span>
			<form
				method="POST"
				action={shown.action}
				use:enhance={() =>
					async ({ update }) => {
						shown = null;
						await update();
					}}
			>
				{#each Object.entries(shown.fields) as [name, value] (name)}
					<input type="hidden" {name} {value} />
				{/each}
				<button class="min-h-12 px-4 font-semibold underline">Undo</button>
			</form>
		</div>
	</div>
{/if}
