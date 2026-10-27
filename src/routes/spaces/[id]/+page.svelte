<script lang="ts">
	import SpaceForm from '#lib/components/SpaceForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<h1 class="mb-5 text-2xl font-bold">Edit space</h1>
<SpaceForm
	values={data.space}
	spaces={data.spaces}
	error={form?.error}
	submitLabel="Save changes"
/>
<p class="mt-4 text-xs text-gray-400">{data.space.id}</p>
