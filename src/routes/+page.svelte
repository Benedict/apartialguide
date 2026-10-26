<script lang="ts">
	import { tick } from 'svelte';
	import { Adventure, distanceWords, type Reply } from '#lib/core/adventure/engine.ts';
	import { skyNow } from '#lib/browser/sky.ts';
	import { fetchArrivals } from '#lib/browser/transit.ts';
	import { loadSettings } from '#lib/browser/settings.ts';
	import { browserSaves } from '#lib/browser/saves.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const settings = loadSettings();

	type Entry = { kind: 'reply'; reply: Reply } | { kind: 'command'; text: string };

	// The world is fixed for the life of the page, so the game reads it once.
	// svelte-ignore state_referenced_locally
	const game = new Adventure(data.world);
	game.saves = browserSaves();
	let transcript: Entry[] = $state([]);
	let command = $state('');
	// Until the tour begins, the only thing to type is to take it.
	let touring = $state(false);
	let history: string[] = [];
	let recall = 0;
	let input: HTMLInputElement;
	// Until the script runs, a submit would reload the page and lose the walk.
	let ready = $state(false);

	// Guide begins once the browser has asked after today's weather, or given up asking.
	$effect(() => {
		skyNow(data.world.weatherAt, new Date(), undefined, { weather: settings.weather }).then(
			async (now) => {
				transcript.push(...game.begin(now).map((reply): Entry => ({ kind: 'reply', reply })));
				ready = true;
				await tick();
				input.focus();
			}
		);
	});

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		const text = command.trim();
		command = '';
		if (text) await run(text);
	}

	async function run(text: string) {
		history = [...history, text];
		recall = history.length;
		transcript.push({ kind: 'command', text });
		await show(game.respond(text));
	}

	// The status line: where you are, how far you have walked, in how many moves.
	let status = $state(game.status());

	async function show(reply: Reply) {
		transcript.push({ kind: 'reply', reply });
		status = game.status();
		if (reply.title) {
			touring = true;
			// What is due at the stops here, from TfL, as the reader arrives; nothing without an answer.
			const here = game.here;
			if (settings.departures)
				for (const stop of game.transitHere())
					fetchArrivals(stop).then((facts) => {
						const due = game.here === here && game.departures(stop, facts);
						if (due) show(due);
					});
		}
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
	<title>A Partial Guide</title>
</svelte:head>

{#if touring}
	<p class="status">
		<span>{status.place}</span>
		<span
			>{distanceWords(status.walked)} · {status.moves} {status.moves === 1 ? 'move' : 'moves'}</span
		>
	</p>
{/if}

<div class="transcript" aria-live="polite">
	{#each transcript as entry, i (i)}
		{#if entry.kind === 'command'}
			<p class="command"><span aria-hidden="true">&gt;</span> {entry.text}</p>
		{:else}
			<section>
				{#if entry.reply.title}<h2>{entry.reply.title}</h2>{/if}
				{#each entry.reply.lines as line, j (j)}<p>{line}</p>{/each}
				{#if entry.reply.actions}
					<p class="actions">
						{#each entry.reply.actions as action (action.command)}
							<button type="button" disabled={touring} onclick={() => run(action.command)}
								>{action.label}</button
							>
						{/each}
					</p>
				{/if}
				{#if entry.reply.link}
					<p>
						<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- another site -->
						<a href={entry.reply.link.href} target="_blank" rel="noopener"
							>{entry.reply.link.text}</a
						>
					</p>
				{/if}
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
		placeholder={touring ? 'north, look, examine… or help' : 'take the tour'}
	/>
</form>

<style>
	.status {
		position: sticky;
		top: 0;
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		margin: 0 0 1rem;
		padding: 0.25rem 0.5rem;
		font-family: var(--mono);
		font-size: 0.8rem;
		background: var(--ink);
		color: var(--paper);
	}

	.actions button {
		font: inherit;
		font-family: var(--mono);
		font-size: 0.95rem;
		color: var(--paper);
		background: var(--accent);
		border: 0;
		border-radius: 4px;
		padding: 0.5rem 0.9rem;
		min-height: 44px;
		cursor: pointer;
	}

	.actions button:disabled {
		opacity: 0.5;
	}

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
		overflow-wrap: anywhere;
	}

	.command {
		font-family: var(--mono);
		font-size: 0.95rem;
		color: var(--accent);
	}

	form {
		position: sticky;
		bottom: 0;
		background: var(--paper);
		padding-block: 0.6rem max(0.8rem, env(safe-area-inset-bottom, 0px));
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
