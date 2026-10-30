<script lang="ts">
	import { resolve } from '$app/paths';
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
	Made from open data. <a href={resolve('/about')}>About</a> ·
	<a href={resolve('/settings')}>Settings</a>
</footer>

<style>
	/* As the classic adventures looked: one typeface, light on dark. Commit Mono, from static/fonts. */
	@font-face {
		font-family: 'Commit Mono';
		font-weight: 400;
		font-display: swap;
		src: url('/fonts/commit-mono-400.woff2') format('woff2');
	}
	@font-face {
		font-family: 'Commit Mono';
		font-weight: 700;
		font-display: swap;
		src: url('/fonts/commit-mono-700.woff2') format('woff2');
	}
	:global(:root) {
		--paper: #000;
		--ink: #d4d4cc;
		--muted: #8e8e86;
		--accent: #fff;
		--rule: #3a3a36;
		--mono: 'Commit Mono', ui-monospace, 'SF Mono', Menlo, Consolas, 'Courier New', monospace;
		color-scheme: dark;
	}

	:global(body) {
		margin: 0;
		background: var(--paper);
		color: var(--ink);
		font-family: var(--mono);
		font-size: 1rem;
		line-height: 1.5;
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
