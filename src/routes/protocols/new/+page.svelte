<script lang="ts">
	import ProtocolForm from '#lib/components/ProtocolForm.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<h1 class="mb-5 text-2xl font-bold">New protocol</h1>
<ProtocolForm values={{ source: 'own' }} error={form?.error} submitLabel="Save protocol" />
