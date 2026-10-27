<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();

	let filter = $state('');
	let busy = $state(false);
	const recipes = $derived(form && 'recipes' in form ? form.recipes : null);
	const shown = $derived(
		recipes?.filter((r) => r.name.toLowerCase().includes(filter.trim().toLowerCase())) ?? []
	);
	const onSubmit = () => {
		busy = true;
		return async ({ update }: { update: () => Promise<void> }) => {
			await update();
			busy = false;
		};
	};
</script>

<h1 class="mb-2 text-2xl font-bold">Import from Paprika</h1>

{#if form?.error}<p class="error">{form.error}</p>{/if}

{#if recipes && form && 'token' in form}
	<p class="mb-4 text-gray-600">
		{recipes.length} recipes in {form.fileName}. Tick the ferments to bring in.
	</p>

	<form method="POST" action="?/import" use:enhance={onSubmit}>
		<input type="hidden" name="token" value={form.token} />
		<input class="input mb-3" type="search" placeholder="Filter by name" bind:value={filter} />

		<ul class="card mb-4 divide-y divide-gray-100">
			{#each recipes as r (r.uid)}
				<li class:hidden={!shown.includes(r)}>
					<label class="flex min-h-12 items-center gap-3 px-4 py-2">
						<input
							type="checkbox"
							name="uid"
							value={r.uid}
							disabled={r.imported}
							class="size-6 rounded"
						/>
						<span class="flex-1">
							<span class="block">{r.name}</span>
							{#if r.imported}
								<span class="block text-sm text-gray-500">Already imported</span>
							{:else if r.categories.length}
								<span class="block text-sm text-gray-500">{r.categories.join(', ')}</span>
							{/if}
						</span>
					</label>
				</li>
			{/each}
		</ul>

		<div class="sticky bottom-16 bg-gray-50 py-2">
			<button class="btn-primary w-full" disabled={busy}>Import ticked recipes</button>
		</div>
	</form>
{:else}
	<p class="mb-4 text-gray-600">
		In Paprika, choose File, Export, and save the <code>.paprikarecipes</code> file. Then pick it here.
		Each recipe you choose becomes a ferment protocol you can start batches from.
	</p>

	<form method="POST" action="?/preview" enctype="multipart/form-data" use:enhance={onSubmit}>
		<input
			class="mb-4 block w-full text-base file:mr-3 file:min-h-12 file:rounded-lg file:border-0 file:bg-gray-200 file:px-4"
			type="file"
			name="file"
			required
		/>
		<button class="btn-primary w-full" disabled={busy}>{busy ? 'Reading...' : 'Read file'}</button>
	</form>
{/if}
