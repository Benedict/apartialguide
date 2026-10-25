<script lang="ts">
	import { resolve } from '$app/paths';
	import { SOURCES } from '#lib/site/sources.ts';
</script>

<svelte:head>
	<title>About · A Partial Guide</title>
</svelte:head>

<h2>About</h2>
<p>
	A Partial Guide is a walk through Addiscombe, in Croydon, told by Guide from open data. Guide says
	only what its sources say, as they say it: where the data is broken, Guide is too. It is an art
	piece, not a game.
</p>
<p>Nothing you do on the walk is sent anywhere, and Guide never asks where you are.</p>
<h3>Where Guide’s words come from</h3>
<ul>
	{#each SOURCES as s (s.name)}
		<li>
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- another site -->
			<a href={s.href}>{s.name}</a>: {s.gives}.
			{#if s.live}<em>Asked from your browser as you read; you can turn it off in Settings.</em
				>{/if}
			<span class="terms">{s.terms}.</span>
		</li>
	{/each}
</ul>
<h3>Who made it</h3>
<p>
	Made by Benedict. The code is on <a href="https://github.com/Benedict/osm-text-adventure"
		>GitHub</a
	>.
</p>
<p><a href={resolve('/')}>Back to the walk</a></p>

<style>
	h2,
	h3 {
		font-size: 1rem;
	}
	ul {
		padding-left: 1.1rem;
		display: grid;
		gap: 0.6rem;
	}
	.terms {
		font-size: 0.8rem;
		color: var(--muted);
	}
	a {
		color: var(--accent);
	}
</style>
