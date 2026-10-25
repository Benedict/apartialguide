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
	Weather from <a href="https://open-meteo.com/">Open-Meteo.com</a>, CC BY 4.0. Departures: Powered
	by TfL Open Data. Another account from
	<a href="https://www.wikidata.org/">Wikidata</a>, CC0. Food hygiene ratings from the
	<a href="https://ratings.food.gov.uk/">Food Standards Agency</a>; listed buildings from
	<a href="https://www.planning.data.gov.uk/">planning.data.gov.uk</a>; planning applications from
	the <a href="https://planningdata.london.gov.uk/">London Planning Datahub</a>; street-level crime
	from <a href="https://data.police.uk/">police.uk</a>; plaques from
	<a href="https://openplaques.org/">Open Plaques</a>. Contains HM Land Registry data © Crown
	copyright and database right 2026, and other public sector information, licensed under the
	<a href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/"
		>Open Government Licence v3.0</a
	>.
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
