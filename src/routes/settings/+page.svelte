<script lang="ts">
	import { resolve } from '$app/paths';
	import { LIVE } from '#lib/site/sources.ts';
	import { loadSettings, saveSettings } from '#lib/browser/settings.ts';

	let settings = $state(loadSettings());
	$effect(() => saveSettings({ ...settings }));
</script>

<svelte:head>
	<title>Settings · A Partial Guide</title>
</svelte:head>

<h2>Settings</h2>
<p>
	Guide can ask two sources from your browser as you read. Turn either off and nothing is asked of
	it; Guide then says nothing of it.
</p>
{#each LIVE as l (l.key)}
	<label>
		<input type="checkbox" name={l.key} bind:checked={settings[l.key]} />
		<span>{l.label} <span class="terms">({l.source})</span></span>
	</label>
{/each}
<p class="terms">Kept in this browser only. A change applies when the walk next begins.</p>
<p><a href={resolve('/')}>Back to the walk</a></p>

<style>
	h2 {
		font-size: 1rem;
	}
	label {
		display: flex;
		gap: 0.6rem;
		align-items: baseline;
		margin-block: 0.6rem;
	}
	input {
		accent-color: var(--accent);
	}
	.terms {
		font-size: 0.8rem;
		color: var(--muted);
	}
	a {
		color: var(--accent);
	}
</style>
