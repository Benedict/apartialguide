<script lang="ts">
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<main>
	{@render children()}
</main>

<footer>
	Map data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>, ODbL.
	Weather from <a href="https://open-meteo.com/">Open-Meteo.com</a>, CC BY 4.0. Another account from
	<a href="https://www.wikidata.org/">Wikidata</a>, CC0.
</footer>

<style>
	:global(:root) {
		--paper: #f6f3ec;
		--ink: #26231f;
		--muted: #6f685e;
		--accent: #8a3b1f;
		--rule: #dcd6cb;
		--mono: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
		color-scheme: light dark;
	}

	@media (prefers-color-scheme: dark) {
		:global(:root) {
			--paper: #1b1a18;
			--ink: #e7e1d6;
			--muted: #9c958a;
			--accent: #e0a07e;
			--rule: #3a3732;
		}
	}

	:global(body) {
		margin: 0;
		background: var(--paper);
		color: var(--ink);
		font-family: Georgia, 'Iowan Old Style', 'Times New Roman', serif;
		font-size: 1.2rem;
		line-height: 1.6;
	}

	main {
		max-width: 34rem;
		margin: 0 auto;
		padding: 4rem 1rem 2rem;
	}

	footer {
		max-width: 34rem;
		margin: 0 auto;
		padding: 2rem 1rem;
		font-size: 0.8rem;
		color: var(--muted);
	}

	footer a {
		color: inherit;
	}
</style>
