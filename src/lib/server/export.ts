import type { AdventureWorld } from '../core/adventure/world';
import { monthYear } from '../core/render/words';

export interface ExportInput {
	/** The game engine bundled for the browser, defining a global `Adventure`. */
	engine: string;
	world: AdventureWorld;
	/** The snapshot's date, as YYYY-MM-DD. */
	snapshotDate: string;
}

/** JSON that is safe inside a script element: no "<" can close it early. */
const scriptSafe = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');

const longDate = (date: string) => `${Number(date.slice(8, 10))} ${monthYear(date)}`;

/** The whole game as one self-contained page: engine, world, styles and prompt. */
export function exportPage({ engine, world, snapshotDate }: ExportInput): string {
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Addiscombe Narrator</title>
<style>
	:root {
		--paper: #f6f4ef; --ink: #26231f; --muted: #6f685e; --rule: #dcd6cb; --accent: #8a3b1f;
		--serif: Georgia, 'Iowan Old Style', 'Times New Roman', serif;
		--mono: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
		--small: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
		color-scheme: light dark;
	}
	@media (prefers-color-scheme: dark) {
		:root { --paper: #1b1a18; --ink: #e7e1d6; --muted: #9c958a; --rule: #3a3732; --accent: #e0a07e; }
	}
	body {
		margin: 0; background: var(--paper); color: var(--ink);
		font-family: var(--serif); font-size: 1.15rem; line-height: 1.6;
		padding-left: max(16px, env(safe-area-inset-left, 0px));
		padding-right: max(16px, env(safe-area-inset-right, 0px));
	}
	.page { max-width: 36rem; margin: 0 auto; padding-block: 2rem 4rem; display: grid; gap: 1.8rem; }
	.note, footer { font-family: var(--small); color: var(--muted); }
	.note { font-size: 0.8rem; line-height: 1.5; border-bottom: 1px solid var(--rule); padding-bottom: 1rem; margin: 0; }
	.note code { font-family: var(--mono); color: var(--accent); }
	#transcript { display: grid; gap: 1.6rem; min-width: 0; }
	section { display: grid; gap: 0.9em; }
	h2 { font-size: 1rem; margin: 0; }
	p { margin: 0; overflow-wrap: anywhere; }
	.command { font-family: var(--mono); font-size: 0.92rem; color: var(--accent); }
	form { display: flex; align-items: baseline; gap: 0.6rem; font-family: var(--mono); font-size: 0.92rem; }
	label { color: var(--accent); }
	input {
		flex: 1; min-width: 0; font: inherit; font-size: max(16px, 1em); color: var(--ink);
		background: transparent; border: 0; border-bottom: 1px solid var(--rule); border-radius: 0;
		padding: 0.3rem 0; outline: none;
	}
	input:focus { border-bottom-color: var(--accent); }
	footer { font-size: 0.75rem; border-top: 1px solid var(--rule); padding-top: 1rem; }
	footer a { color: inherit; }
</style>
</head>
<body>
<div class="page">
	<p class="note">Addiscombe, Croydon. Type a direction (<code>n</code>, <code>go east</code>, or a street name), <code>look</code>, <code>explore</code>, <code>examine</code> something, <code>exits</code>, <code>back</code> or <code>help</code>.</p>
	<div id="transcript" aria-live="polite"></div>
	<form id="prompt" autocomplete="off">
		<label for="command">&gt;</label>
		<input id="command" autocapitalize="off" spellcheck="false" aria-label="What do you do?" placeholder="north, look, examine…">
	</form>
	<footer>Map data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>, ODbL, as of ${longDate(snapshotDate)}.</footer>
</div>
<script>${engine}</script>
<script>
const WORLD = ${scriptSafe(world)};
(() => {
	const game = new Adventure(WORLD);
	const transcript = document.getElementById('transcript');
	const input = document.getElementById('command');
	const history = [];
	let recall = 0;
	const el = (tag, text, cls) => Object.assign(document.createElement(tag), { textContent: text, className: cls || '' });
	function show(reply) {
		if (!reply.lines.length) return;
		const section = document.createElement('section');
		if (reply.title) section.append(el('h2', reply.title));
		for (const line of reply.lines) section.append(el('p', line));
		transcript.append(section);
	}
	document.getElementById('prompt').addEventListener('submit', (event) => {
		event.preventDefault();
		const text = input.value.trim();
		input.value = '';
		if (!text) return;
		history.push(text);
		recall = history.length;
		transcript.append(el('p', '> ' + text, 'command'));
		show(game.respond(text));
		input.scrollIntoView({ block: 'end' });
	});
	input.addEventListener('keydown', (event) => {
		if (event.key === 'ArrowUp' && recall > 0) input.value = history[--recall];
		else if (event.key === 'ArrowDown' && recall < history.length) input.value = history[++recall] ?? '';
		else return;
		event.preventDefault();
	});
	show(game.look());
	input.focus({ preventScroll: true });
})();
</script>
</body>
</html>
`;
}
