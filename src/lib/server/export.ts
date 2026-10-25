import { gzipSync } from 'node:zlib';
import type { AdventureWorld } from '../core/adventure/world';
import { longDate } from '../core/render/words';
import { LIVE, SOURCES } from '../site/sources';

export interface ExportInput {
	/** The game engine bundled for the browser, defining a global `Adventure`. */
	engine: string;
	world: AdventureWorld;
	/** The snapshot's date, as YYYY-MM-DD. */
	snapshotDate: string;
}

/** The world as the page carries it: gzip, then base64, which nothing in a script element can break out of. */
const packed = (world: AdventureWorld) =>
	gzipSync(Buffer.from(JSON.stringify(world), 'utf8'), { level: 9 }).toString('base64');

const esc = (text: string) =>
	text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** The About page: what the piece is, every source and its terms, and who made it. */
function aboutPage(snapshotDate: string): string {
	const sources = SOURCES.map(
		(s) =>
			`<li><a href="${esc(s.href)}">${esc(s.name)}</a>: ${esc(s.gives)}.${s.live ? ' <em>Asked from your browser as you read; you can turn it off in Settings.</em>' : ''} <span class="terms">${esc(s.terms)}.</span></li>`
	).join('\n\t\t\t');
	return `<section id="about" class="view" hidden>
		<h2>About</h2>
		<p>A Partial Guide is a walk through Addiscombe, in Croydon, told by Guide from open data. Guide says only what its sources say, as they say it: where the data is broken, Guide is too. It is an art piece, not a game.</p>
		<p>The map Guide carries is dated ${esc(longDate(snapshotDate))}. Nothing you do on the walk is sent anywhere, and Guide never asks where you are.</p>
		<h3>Where Guide’s words come from</h3>
		<ul class="sources">
			${sources}
		</ul>
		<h3>Who made it</h3>
		<p>Made by Benedict. The code is on <a href="https://github.com/Benedict/osm-text-adventure">GitHub</a>.</p>
		<p><a href="#">Back to the walk</a></p>
	</section>`;
}

/** The Settings page: whether to ask each live source from the reader's browser. */
function settingsPage(): string {
	const choices = LIVE.map(
		(l) =>
			`<label class="choice"><input type="checkbox" name="${l.key}" checked><span>${esc(l.label)} <span class="terms">(${esc(l.source)})</span></span></label>`
	).join('\n\t\t');
	return `<section id="settings" class="view" hidden>
		<h2>Settings</h2>
		<p>Guide can ask two sources from your browser as you read. Turn either off and nothing is asked of it; Guide then says nothing of it.</p>
		${choices}
		<p class="terms">Kept in this browser only. A change to the weather applies when the walk next begins.</p>
		<p><a href="#">Back to the walk</a></p>
	</section>`;
}

/** The whole game as one self-contained page: engine, world, styles and prompt. */
export function exportPage({ engine, world, snapshotDate }: ExportInput): string {
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content">
<title>A Partial Guide</title>
<style>
	:root {
		--paper: #f6f4ef; --ink: #26231f; --muted: #6f685e; --rule: #dcd6cb; --accent: #8a3b1f;
		--serif: Georgia, 'Iowan Old Style', 'Times New Roman', serif;
		--mono: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
		--small: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
		--height: 100dvh;
		color-scheme: light dark;
	}
	@media (prefers-color-scheme: dark) {
		:root { --paper: #1b1a18; --ink: #e7e1d6; --muted: #9c958a; --rule: #3a3732; --accent: #e0a07e; }
	}
	html, body { margin: 0; height: var(--height); overflow: hidden; }
	body {
		background: var(--paper); color: var(--ink);
		font-family: var(--serif); font-size: 1.15rem; line-height: 1.6;
		display: flex; flex-direction: column;
	}
	header, .scroll > *, form {
		box-sizing: border-box; width: 100%; max-width: 38rem; margin-inline: auto;
		padding-left: max(16px, env(safe-area-inset-left, 0px));
		padding-right: max(16px, env(safe-area-inset-right, 0px));
	}
	header {
		display: flex; justify-content: space-between; align-items: baseline; gap: 1rem;
		font-family: var(--small); font-size: 0.8rem; color: var(--muted);
		padding-top: max(0.6rem, env(safe-area-inset-top, 0px)); padding-bottom: 0.6rem;
	}
	header nav { display: flex; gap: 1rem; }
	header a { color: inherit; }
	.scroll { flex: 1; overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; }
	#transcript { display: grid; gap: 1.6rem; padding-block: 1rem 1.5rem; }
	section { display: grid; gap: 0.9em; }
	.view { padding-block: 1rem 2rem; }
	[hidden] { display: none !important; }
	h2 { font-size: 1rem; margin: 0; }
	h3 { font-size: 0.95rem; margin: 0.6rem 0 0; }
	p { margin: 0; overflow-wrap: anywhere; }
	a { color: var(--accent); }
	.command { font-family: var(--mono); font-size: 0.92rem; color: var(--accent); }
	.sources { margin: 0; padding-left: 1.1rem; display: grid; gap: 0.6rem; }
	.terms { font-family: var(--small); font-size: 0.8rem; color: var(--muted); }
	.choice { display: flex; gap: 0.6rem; align-items: baseline; }
	.choice input { width: 1.1rem; height: 1.1rem; flex: none; accent-color: var(--accent); }
	form {
		display: flex; align-items: baseline; gap: 0.6rem; font-family: var(--mono); font-size: 0.92rem;
		border-top: 1px solid var(--rule); background: var(--paper);
		padding-top: 0.6rem; padding-bottom: max(0.8rem, env(safe-area-inset-bottom, 0px));
	}
	form label { color: var(--accent); }
	#command {
		flex: 1; min-width: 0; font: inherit; font-size: max(16px, 1em); color: var(--ink);
		background: transparent; border: 0; border-bottom: 1px solid var(--rule); border-radius: 0;
		padding: 0.3rem 0; outline: none;
	}
	#command:focus { border-bottom-color: var(--accent); }
</style>
</head>
<body>
<header>
	<span>A Partial Guide</span>
	<nav><a href="#about">About</a><a href="#settings">Settings</a></nav>
</header>
<div class="scroll" id="scroll">
	<div id="game"><div id="transcript" aria-live="polite"></div></div>
	${aboutPage(snapshotDate)}
	${settingsPage()}
</div>
<form id="prompt" autocomplete="off">
	<label for="command">&gt;</label>
	<input id="command" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="go" aria-label="What do you do?" placeholder="take the tour">
</form>
<script>${engine}</script>
<script type="application/gzip" id="world">${packed(world)}</script>
<script>
(async () => {
	const scroll = document.getElementById('scroll');
	const form = document.getElementById('prompt');
	const views = { game: document.getElementById('game'), about: document.getElementById('about'), settings: document.getElementById('settings') };
	// The page is as tall as what is visible, so an on-screen keyboard pushes the prompt up, not over it.
	const fit = () => {
		const vv = window.visualViewport;
		document.documentElement.style.setProperty('--height', (vv ? vv.height : window.innerHeight) + 'px');
		if (!views.game.hidden) scroll.scrollTop = scroll.scrollHeight;
	};
	if (window.visualViewport) {
		window.visualViewport.addEventListener('resize', fit);
		window.visualViewport.addEventListener('scroll', () => window.scrollTo(0, 0));
	}
	window.addEventListener('resize', fit);
	fit();
	// About and Settings are views of this one page, so the walk is never lost by visiting them.
	function route() {
		const at = location.hash.slice(1);
		const view = at in views && at !== 'game' ? at : 'game';
		for (const [name, el] of Object.entries(views)) el.hidden = name !== view;
		form.hidden = view !== 'game';
		if (view === 'game') scroll.scrollTop = scroll.scrollHeight;
		else scroll.scrollTop = 0;
	}
	window.addEventListener('hashchange', route);
	route();

	const settings = loadSettings();
	for (const box of document.querySelectorAll('#settings input[type="checkbox"]')) {
		box.checked = settings[box.name] !== false;
		box.addEventListener('change', () => {
			settings[box.name] = box.checked;
			saveSettings(settings);
		});
	}

	// The world arrives compressed: a large place would otherwise weigh tens of megabytes.
	const bytes = Uint8Array.from(atob(document.getElementById('world').textContent), (c) => c.charCodeAt(0));
	const unzipped = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
	const WORLD = JSON.parse(await new Response(unzipped).text());
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
		if (reply.link) {
			const a = el('a', reply.link.text);
			a.href = reply.link.href;
			a.target = '_blank';
			a.rel = 'noopener';
			const p = el('p', '');
			p.append(a);
			section.append(p);
		}
		transcript.append(section);
		scroll.scrollTop = scroll.scrollHeight;
		if (reply.title) {
			input.placeholder = 'north, look, examine… or help';
			// What is due at the stops here, from TfL, as the reader arrives, if they allow it; nothing without an answer.
			const here = game.here;
			if (settings.departures !== false)
				for (const stop of game.transitHere())
					fetchArrivals(stop).then((facts) => {
						const due = game.here === here && game.departures(stop, facts);
						if (due) show(due);
					});
		}
	}

	form.addEventListener('submit', (event) => {
		event.preventDefault();
		const text = input.value.trim();
		input.value = '';
		if (!text) return;
		history.push(text);
		recall = history.length;
		transcript.append(el('p', '> ' + text, 'command'));
		show(game.respond(text));
	});
	input.addEventListener('keydown', (event) => {
		if (event.key === 'ArrowUp' && recall > 0) input.value = history[--recall];
		else if (event.key === 'ArrowDown' && recall < history.length) input.value = history[++recall] ?? '';
		else return;
		event.preventDefault();
	});
	input.addEventListener('focus', () => setTimeout(fit, 300));
	// Until Guide has begun, there is nothing to answer.
	input.disabled = true;
	skyNow(WORLD.weatherAt, new Date(), undefined, { weather: settings.weather !== false }).then((now) => {
		game.begin(now).forEach(show);
		input.disabled = false;
		if (!location.hash) input.focus({ preventScroll: true });
	});
})();
</script>
</body>
</html>
`;
}
