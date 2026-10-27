<script lang="ts">
	import SpaceForm from '#lib/components/SpaceForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<h1 class="mb-5 text-2xl font-bold">New space</h1>
<SpaceForm spaces={data.spaces} error={form?.error} submitLabel="Save space" />
