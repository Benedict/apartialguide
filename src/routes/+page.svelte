<script lang="ts">
	import { tick } from 'svelte';
	import { Adventure, type Reply } from '#lib/core/adventure/engine.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Entry = { kind: 'reply'; reply: Reply } | { kind: 'command'; text: string };

	// The world is fixed for the life of the page, so the game reads it once.
	// svelte-ignore state_referenced_locally
	const game = new Adventure(data.world);
	let transcript: Entry[] = $state([{ kind: 'reply', reply: game.look() }]);
	let command = $state('');
	let history: string[] = [];
	let recall = 0;
	let input: HTMLInputElement;
	// Until the script runs, a submit would reload the page and lose the walk.
	let ready = $state(false);

	$effect(() => {
		ready = true;
		input.focus();
	});

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		const text = command.trim();
		command = '';
		if (!text) return;
		history = [...history, text];
		recall = history.length;
		transcript.push({ kind: 'command', text }, { kind: 'reply', reply: game.respond(text) });
		await tick();
		input.scrollIntoView({ block: 'end' });
	}

	function keydown(event: KeyboardEvent) {
		if (event.key === 'ArrowUp' && recall > 0) command = history[--recall];
		else if (event.key === 'ArrowDown' && recall < history.length)
			command = history[++recall] ?? '';
		else return;
		event.preventDefault();
	}
</script>

<svelte:head>
	<title>Addiscombe Narrator</title>
</svelte:head>

<div class="transcript" aria-live="polite">
	{#each transcript as entry, i (i)}
		{#if entry.kind === 'command'}
			<p class="command"><span aria-hidden="true">&gt;</span> {entry.text}</p>
		{:else}
			<section>
				{#if entry.reply.title}<h2>{entry.reply.title}</h2>{/if}
				{#each entry.reply.lines as line, j (j)}<p>{line}</p>{/each}
			</section>
		{/if}
	{/each}
</div>

<form onsubmit={submit}>
	<label for="command" class="prompt">&gt;</label>
	<input
		id="command"
		bind:this={input}
		bind:value={command}
		disabled={!ready}
		onkeydown={keydown}
		autocomplete="off"
		autocapitalize="off"
		spellcheck="false"
		aria-label="What do you do?"
		placeholder="north, look, examine…"
	/>
</form>

<style>
	.transcript {
		display: grid;
		gap: 1.6rem;
	}

	section {
		display: grid;
		gap: 0.9em;
	}

	h2 {
		font-size: 1rem;
		font-weight: 700;
		letter-spacing: 0.02em;
		margin: 0;
	}

	p {
		margin: 0;
	}

	.command {
		font-family: var(--mono);
		font-size: 0.95rem;
		color: var(--accent);
	}

	form {
		display: flex;
		align-items: baseline;
		gap: 0.6rem;
		margin-top: 1.6rem;
		font-family: var(--mono);
		font-size: 0.95rem;
	}

	.prompt {
		color: var(--accent);
	}

	input {
		flex: 1;
		min-width: 0;
		font: inherit;
		color: var(--ink);
		background: transparent;
		border: 0;
		border-bottom: 1px solid var(--rule);
		padding: 0.3rem 0;
		outline: none;
	}

	input:focus {
		border-bottom-color: var(--accent);
	}

	input::placeholder {
		color: var(--muted);
	}
</style>
