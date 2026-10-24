<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Addiscombe Narrator</title>
</svelte:head>

<article>
	{#each data.paragraphs as paragraph, i (i)}
		<p>{paragraph}</p>
	{/each}
</article>

<nav aria-label="Directions">
	<ul>
		{#each data.exits as exit (exit.to + exit.label)}
			<li>
				<a href={resolve('/stop/[id]', { id: exit.to })} data-sveltekit-noscroll>{exit.label}</a>
			</li>
		{/each}
	</ul>
</nav>

<style>
	article p {
		margin: 0 0 1.2em;
	}

	nav ul {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1.25rem;
		list-style: none;
		padding: 0;
		margin: 2.5rem 0 0;
	}

	nav a {
		font-variant: small-caps;
		letter-spacing: 0.04em;
		color: var(--ink);
		text-decoration-thickness: 1px;
		text-underline-offset: 0.25em;
	}

	nav a:hover,
	nav a:focus-visible {
		color: var(--accent);
	}
</style>
