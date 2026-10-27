<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import IconMoodConfused from '@tabler/icons-svelte-runes/icons/mood-confused';
</script>

<div class="flex flex-col items-center gap-3 pt-10 text-center">
	<IconMoodConfused size={48} stroke={1.5} class="text-ink-muted" aria-hidden="true" />
	{#if page.status === 404}
		<h1 class="text-2xl font-bold">Nothing here</h1>
		<p class="text-ink-muted">That page doesn't exist, or it was deleted.</p>
		<a class="btn-primary mt-2" href={resolve('/')}>Back to Today</a>
	{:else}
		<h1 class="text-2xl font-bold">Something went wrong</h1>
		<!-- Wi-Fi drops look like any other error from here (D52), so the hint covers both. -->
		<p class="max-w-xs text-ink-muted">
			If the phone lost Wi-Fi or the computer running Cellar went to sleep, try again once it's
			back.
		</p>
		<div class="mt-2 flex gap-2">
			<button class="btn-primary" onclick={() => location.reload()}>Try again</button>
			<a class="btn" href={resolve('/')}>Today</a>
		</div>
	{/if}
</div>
