<script lang="ts">
	import ProtocolForm from '#lib/components/ProtocolForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<h1 class="mb-1 text-2xl font-bold">Edit protocol</h1>
<p class="mb-5 text-sm text-gray-500">
	Saving makes version {data.protocol.version + 1}. Batches already started keep the version they
	began with.
</p>
<ProtocolForm
	values={data.protocol}
	batchType={data.protocol.batchType}
	error={form?.error}
	submitLabel="Save as new version"
/>
