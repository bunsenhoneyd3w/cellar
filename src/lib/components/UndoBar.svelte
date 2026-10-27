<script lang="ts">
	import { enhance } from '$app/forms';

	type Done = { id: string; title: string };
	type Props = { done?: Done | null };
	let { done }: Props = $props();

	// After a Done, offer Undo for a few seconds in case the wrong row was tapped.
	let shown = $state<Done | null>(null);
	$effect(() => {
		shown = done ?? null;
		if (!done) return;
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
			<span class="min-w-0 flex-1 truncate">Done: {shown.title}</span>
			<form
				method="POST"
				action="?/undo"
				use:enhance={() =>
					async ({ update }) => {
						shown = null;
						await update();
					}}
			>
				<input type="hidden" name="taskId" value={shown.id} />
				<button class="min-h-12 px-4 font-semibold underline">Undo</button>
			</form>
		</div>
	</div>
{/if}
