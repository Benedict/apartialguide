import { gzipSync } from 'node:zlib';
import { packWorld } from '../core/adventure/packed';
import { headOf } from '../core/adventure/tiles';
import type { AdventureWorld } from '../core/adventure/world';
import { longDate } from '../core/render/words';
import { LIVE, SOURCES } from '../site/sources';

export interface ExportInput {
	/** The game engine bundled for the browser, defining a global `Adventure`. */
	engine: string;
	world: AdventureWorld;
	/** The snapshot's date, as YYYY-MM-DD. */
	snapshotDate: string;
	/** Where the flights function answers, if one is deployed (`FLIGHTS_URL`). */
	flightsUrl?: string;
	/**
	 * Where the world's tiles are served, relative to the page, when it is served in pieces
	 * (`tileWorld`); the world passed is then the head alone. Without it the page carries the world.
	 */
	tiles?: string;
	/** The Google Analytics measurement ID (`GA_MEASUREMENT_ID`): counted only once the reader says yes. */
	gaId?: string;
}

/** What the page tells the reader it sends, with analytics or without. */
export const PRIVACY = {
	none: 'Nothing you do on the walk is sent anywhere, and Guide never asks where you are.',
	counted:
		'If you agree, this page counts your visit with Google Analytics: which page you opened and, on the walk, the kind of each command (a step, a look, a route), never what you type. Without your yes nothing is sent. You can change your answer in Settings. Guide never asks where you are.'
};

/** The strip that asks, once, whether the visit may be counted. */
export const consentStrip = (page: string) =>
	`<div class="consent" id="consent" hidden><p>May ${page} count your visit with Google Analytics? It would know which page you opened and the kind of each command, never what you type. <button type="button" data-consent="granted">Yes</button> <button type="button" data-consent="denied">No</button></p></div>`;

/** The world as the page carries it: packed, gzip, then base64, which nothing in a script element can break out of. */
const packed = (world: AdventureWorld) =>
	gzipSync(Buffer.from(JSON.stringify(packWorld(world)), 'utf8'), { level: 9 }).toString('base64');

/** What Guide needs to speak before the map is opened, as JSON nothing in a script element can break out of. */
const head = (world: AdventureWorld, tiled: boolean) => {
	const { asOf, about, weatherAt } = world;
	return JSON.stringify(tiled ? headOf(world) : { asOf, about, weatherAt }).replace(
		/</g,
		'\\u003c'
	);
};

const esc = (text: string) =>
	text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** The About page: what the piece is, every source and its terms, and who made it. */
function aboutPage(snapshotDate: string, counted: boolean): string {
	const sources = SOURCES.map(
		(s) =>
			`<li><a href="${esc(s.href)}">${esc(s.name)}</a>: ${esc(s.gives)}.${s.live ? ' <em>Asked from your browser as you read; you can turn it off in Settings.</em>' : ''} <span class="terms">${esc(s.terms)}.</span></li>`
	).join('\n\t\t\t');
	return `<section id="about" class="view" hidden>
		<h2>About</h2>
		<p>A Partial Guide is a walk through Addiscombe, in Croydon, told by Guide from open data. Guide says only what its sources say, as they say it: where the data is broken, Guide is too. It is an art piece, not a game.</p>
		<p>The map Guide carries is dated ${esc(longDate(snapshotDate))}. ${counted ? PRIVACY.counted : PRIVACY.none}</p>
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
function settingsPage(counted: boolean): string {
	const choices = LIVE.map(
		(l) =>
			`<label class="choice"><input type="checkbox" name="${l.key}" checked><span>${esc(l.label)} <span class="terms">(${esc(l.source)})</span></span></label>`
	).join('\n\t\t');
	return `<section id="settings" class="view" hidden>
		<h2>Settings</h2>
		<p>Guide can ask these sources from your browser as you read, always for the map’s own places, never yours. Turn any off and nothing is asked of it; Guide then says nothing of it.</p>
		${choices}${
			counted
				? `
		<label class="choice"><input type="checkbox" name="analytics"><span>Count my visit <span class="terms">(Google Analytics; the kind of each command, never what you type)</span></span></label>`
				: ''
		}
		<p class="terms">Kept in this browser only. A change to the weather applies when the walk next begins.</p>
		<p><a href="#">Back to the walk</a></p>
	</section>`;
}

/**
 * Words the code let slip into what Guide says: undefined, null, NaN, never the data's own. Each as
 * the stop and the text it is in. A world with any is not fit to publish.
 */
export function wordsAmiss(world: AdventureWorld): string[] {
	const amiss: string[] = [];
	for (const [id, stop] of Object.entries(world.stops)) {
		const said = [
			stop.title,
			...stop.paragraphs,
			...(stop.hidden?.lines ?? []),
			...[...stop.things, ...(stop.hidden?.things ?? []), ...(stop.streets ?? [])].flatMap((t) => [
				t.name,
				t.description
			])
		];
		for (const text of said)
			if (/\b(undefined|null|NaN)\b/.test(text)) amiss.push(`${id}: ${text}`);
	}
	return amiss;
}

/** The whole game as one self-contained page: engine, world, styles and prompt. */
export function exportPage({
	engine,
	world,
	snapshotDate,
	flightsUrl,
	tiles,
	gaId
}: ExportInput): string {
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content">
<title>A Partial Guide</title>
<style>
	/* As the classic adventures looked: one typeface, light on dark, an inverse status bar on top. */
	:root {
		--paper: #000; --ink: #d4d4cc; --bright: #fff; --muted: #8e8e86; --rule: #3a3a36; --accent: #fff;
		--mono: ui-monospace, 'SF Mono', Menlo, Consolas, 'Courier New', monospace;
		--serif: var(--mono); --small: var(--mono);
		--height: 100dvh;
		color-scheme: dark;
	}
	html, body { margin: 0; height: var(--height); overflow: hidden; }
	body {
		background: var(--paper); color: var(--ink);
		font-family: var(--mono); font-size: 1rem; line-height: 1.5;
		display: flex; flex-direction: column;
	}
	.scroll > *, form, .menu {
		box-sizing: border-box; width: 100%; max-width: 40rem; margin-inline: auto;
		padding-left: max(16px, env(safe-area-inset-left, 0px));
		padding-right: max(16px, env(safe-area-inset-right, 0px));
	}
	.status {
		box-sizing: border-box; display: flex; justify-content: space-between; gap: 1rem;
		font-size: 0.85rem; font-weight: 700; background: var(--ink); color: var(--paper);
		padding: max(0.25rem, env(safe-area-inset-top, 0px)) max(16px, env(safe-area-inset-right, 0px)) 0.25rem max(16px, env(safe-area-inset-left, 0px));
	}
	.status span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.status span:last-child { flex: none; white-space: pre; }
	.actions { display: flex; flex-wrap: wrap; gap: 0.6rem; }
	.actions button {
		font: inherit; color: var(--bright); background: transparent;
		border: 1px solid var(--ink); border-radius: 0; padding: 0.5rem 0.9rem; cursor: pointer; min-height: 44px;
	}
	.actions button:hover:not(:disabled), .actions button:focus-visible { background: var(--ink); color: var(--paper); outline: none; }
	.actions button:disabled { opacity: 0.4; cursor: default; }
	.picture { display: block; width: 100%; height: auto; border: 1px solid var(--rule); }
	.map { height: 0; overflow: hidden; visibility: hidden; }
	/* The map kept under the status bar while gps is on, on any screen. */
	.follow { flex: none; height: min(32vh, 260px); border-bottom: 1px solid var(--rule); }
	.follow[hidden] { display: none; }
	/* Asked once, before anything is counted. */
	.consent { flex: none; border-bottom: 1px solid var(--rule); padding: 0.5rem 1rem; font-size: 0.85rem; }
	.consent[hidden] { display: none; }
	.consent p { margin: 0; }
	.consent button { font: inherit; margin-left: 0.5ch; }
	.map.drawn { height: 320px; visibility: visible; border: 1px solid var(--rule); }
	.scroll { flex: 1; overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; }
	#transcript { display: grid; gap: 1.5em; padding-block: 1rem 1.5rem; }
	section { display: grid; gap: 1em; }
	.view { padding-block: 1rem 2rem; }
	[hidden] { display: none !important; }
	h2 { font-size: 1em; font-weight: 700; color: var(--bright); margin: 0; }
	h3 { font-size: 1em; font-weight: 700; color: var(--bright); margin: 0.6rem 0 0; }
	p { margin: 0; overflow-wrap: anywhere; }
	a { color: var(--bright); }
	.command { color: var(--bright); }
	.sources { margin: 0; padding-left: 1.1rem; display: grid; gap: 0.6rem; }
	.terms { font-size: 0.85rem; color: var(--muted); }
	.choice { display: flex; gap: 0.6rem; align-items: baseline; }
	.choice input { width: 1.1rem; height: 1.1rem; flex: none; accent-color: var(--ink); }
	form {
		display: flex; align-items: baseline; gap: 1ch; background: var(--paper);
		padding-top: 0.5rem; padding-bottom: 0.25rem;
	}
	form label { color: var(--bright); }
	#command {
		flex: 1; min-width: 0; font: inherit; font-size: max(16px, 1em); color: var(--bright);
		background: transparent; border: 0; border-radius: 0; padding: 0; outline: none;
		caret-color: var(--bright);
	}
	#command::placeholder { color: var(--muted); }
	.menu {
		display: flex; justify-content: flex-end; gap: 1.2rem; font-size: 0.8rem;
		padding-bottom: max(0.6rem, env(safe-area-inset-bottom, 0px));
	}
	.menu a { color: var(--muted); }
</style>
</head>
<body>
<div class="status" id="status"><span>A Partial Guide</span><span></span></div>
<div class="follow" id="follow" hidden></div>${
		gaId
			? `
${consentStrip('this page')}`
			: ''
	}
<div class="scroll" id="scroll">
	<div id="game"><div id="transcript" aria-live="polite"></div></div>
	${aboutPage(snapshotDate, !!gaId)}
	${settingsPage(!!gaId)}
</div>
<form id="prompt" autocomplete="off">
	<label for="command">&gt;</label>
	<input id="command" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="go" aria-label="What do you do?" placeholder="take the tour">
</form>
<nav class="menu"><a href="#about">About</a><a href="#settings">Settings</a></nav>
<script>${engine}</script>
<script type="application/json" id="head">${head(world, !!tiles)}</script>
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
	// The flights function, if one was deployed when the page was built; without one, no aircraft are asked after.
	const FLIGHTS = ${JSON.stringify(flightsUrl ?? '')};
	// Where the world's tiles are served, when it comes in pieces; empty when the page carries it.
	const TILES = ${JSON.stringify(tiles ?? '')};
	// Google Analytics, only on the reader's yes: given before, or given now. Never what they type.
	const GA = ${JSON.stringify(gaId ?? '')};
	if (GA && loadConsent() === 'granted') startAnalytics(GA);
	const count = (name, params) => {
		if (GA && loadConsent() === 'granted') track(name, params);
	};
	const consentBox = document.querySelector('#settings input[name="analytics"]');
	const consentStrip = document.getElementById('consent');
	function answer(consent) {
		saveConsent(consent);
		if (consent === 'granted') startAnalytics(GA);
		if (consentStrip) consentStrip.hidden = true;
		if (consentBox) consentBox.checked = consent === 'granted';
		fit();
	}
	if (GA) {
		if (!loadConsent()) consentStrip.hidden = false;
		for (const button of consentStrip.querySelectorAll('button'))
			button.addEventListener('click', () => answer(button.dataset.consent));
		consentBox.checked = loadConsent() === 'granted';
		consentBox.addEventListener('change', () => answer(consentBox.checked ? 'granted' : 'denied'));
	}
	for (const box of document.querySelectorAll('#settings input[type="checkbox"]:not([name="analytics"])')) {
		box.checked = settings[box.name] !== false;
		box.addEventListener('change', () => {
			settings[box.name] = box.checked;
			saveSettings(settings);
		});
	}

	// What Guide says before the map is opened: the introduction, and where to ask about the weather.
	const HEAD = JSON.parse(document.getElementById('head').textContent);
	// The world arrives compressed, after this script, so Guide can speak while the page still reads it.
	async function openWorld() {
		if (document.readyState === 'loading')
			await new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
		// A plain loop: Uint8Array.from with a callback is many times slower on a phone.
		const base64 = atob(document.getElementById('world').textContent);
		const bytes = new Uint8Array(base64.length);
		for (let i = 0; i < base64.length; i++) bytes[i] = base64.charCodeAt(i);
		const unzipped = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
		return unpackWorld(JSON.parse(await new Response(unzipped).text()));
	}
	// Set once the world is open; nothing asks it anything before then.
	let game;
	// Opens the places a command needs, when the world comes in pieces; nothing to do when it is carried.
	let ensure = async () => {};
	// The way ahead, fetched while the reader reads, so a step seldom waits.
	const ahead = () => ensure(game.needs('look')).catch(() => {});
	const transcript = document.getElementById('transcript');
	const statusBar = document.getElementById('status');
	const input = document.getElementById('command');
	const history = [];
	let recall = 0;
	const el = (tag, text, cls) => Object.assign(document.createElement(tag), { textContent: text, className: cls || '' });
	// What a reply wants asked, from the reader's browser, for the map's own place, if they allow it.
	function askFor(ask) {
		const here = game.here;
		if (ask === 'overhead')
			Promise.all([
				settings.satellites !== false ? fetchSatellites() : undefined,
				settings.flights !== false ? fetchFlights(FLIGHTS) : undefined
			]).then(([satellites, flights]) => {
				const seen = game.here === here && game.overhead(satellites, flights);
				if (seen) show(seen);
			});
		if (ask === 'camera') {
			const at = game.position();
			if (settings.cameras === false || !at) return show(game.camera(undefined));
			fetchCamera(at).then((facts) => {
				if (game.here === here) show(game.camera(facts));
			});
		}
	}
	function show(reply) {
		if (reply.ask) askFor(reply.ask);
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
		if (reply.actions) {
			const actions = el('p', '', 'actions');
			for (const action of reply.actions) {
				const button = el('button', action.label);
				button.type = 'button';
				button.addEventListener('click', () => {
					for (const b of actions.querySelectorAll('button')) b.disabled = true;
					run(action.command);
				});
				actions.append(button);
			}
			section.append(actions);
		}
		if (reply.image) {
			const img = el('img', '', 'picture');
			img.src = reply.image.src;
			img.alt = reply.image.alt;
			img.addEventListener('load', () => (scroll.scrollTop = scroll.scrollHeight));
			section.append(img);
		}
		transcript.append(section);
		if (reply.follow === false) unfollow();
		if (reply.map) reply.follow ? follow(reply.map) : drawMap(section, reply.map);
		scroll.scrollTop = scroll.scrollHeight;
		showStatus();
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

	// The status line, as classic adventures kept one: where you are, how far you have walked, in how many moves.
	let touring = false;
	function showStatus() {
		if (!game) return;
		const now = game.status();
		if (!touring && now.moves === 0 && !transcript.querySelector('h2')) return;
		touring = true;
		const [place, count] = statusBar.children;
		place.textContent = now.place;
		count.textContent = 'Walked: ' + distanceWords(now.walked) + '  Moves: ' + now.moves;
	}

	// gps draws its place on a map, on a wide screen, if the reader allows it; nothing at all if the map does not come.
	let maplibre;
	const MAPLIBRE_JS = 'https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js';
	const MAPLIBRE_CSS = 'https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css';
	function loadMaplibre() {
		maplibre ??= new Promise((resolve, reject) => {
			const css = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: MAPLIBRE_CSS });
			const js = Object.assign(document.createElement('script'), { src: MAPLIBRE_JS });
			js.onload = () => (window.maplibregl ? resolve(window.maplibregl) : reject(new Error('no maplibre')));
			js.onerror = reject;
			document.head.append(css, js);
		});
		return maplibre;
	}
	function drawMap(section, place) {
		if (settings.maps === false || !window.matchMedia('(min-width: 700px)').matches) return;
		loadMaplibre()
			.then((gl) => {
				const box = el('div', '', 'map');
				section.append(box);
				const map = new gl.Map({
					container: box,
					style: 'https://tiles.openfreemap.org/styles/liberty',
					center: [place.longitude, place.latitude],
					zoom: 16.5,
					attributionControl: { compact: true }
				});
				new gl.Marker({ color: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#8a3b1f' })
					.setLngLat([place.longitude, place.latitude])
					.addTo(map);
				const late = setTimeout(() => { map.remove(); box.remove(); }, 8000);
				map.once('load', () => {
					clearTimeout(late);
					box.classList.add('drawn');
					map.resize();
					scroll.scrollTop = scroll.scrollHeight;
				});
			})
			.catch(() => {});
	}

	// gps on: one map kept under the status bar, moved to each stop; gps off puts it away.
	const followBox = document.getElementById('follow');
	let followed;
	function follow(place) {
		if (settings.maps === false) return;
		loadMaplibre()
			.then((gl) => {
				if (followed) {
					followed.map.easeTo({ center: [place.longitude, place.latitude] });
					followed.marker.setLngLat([place.longitude, place.latitude]);
					return;
				}
				// Laid out but unseen until it has drawn, as a map must have its size to draw.
				followBox.hidden = false;
				followBox.style.visibility = 'hidden';
				fit();
				const map = new gl.Map({
					container: followBox,
					style: 'https://tiles.openfreemap.org/styles/liberty',
					center: [place.longitude, place.latitude],
					zoom: 16.5,
					attributionControl: { compact: true }
				});
				const marker = new gl.Marker({ color: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#8a3b1f' })
					.setLngLat([place.longitude, place.latitude])
					.addTo(map);
				followed = { map, marker };
				// Shown once it has drawn; if it never does, the walk carries on without it.
				const late = setTimeout(() => followed?.map === map && unfollow(), 8000);
				map.once('load', () => {
					clearTimeout(late);
					if (followed?.map !== map) return;
					followBox.style.visibility = '';
					map.resize();
				});
			})
			.catch(() => {});
	}
	function unfollow() {
		followed?.map.remove();
		followed = undefined;
		followBox.hidden = true;
		followBox.style.visibility = '';
		followBox.textContent = '';
		fit();
	}

	// The street network, served apart, for planning a way: fetched the first time one is asked for.
	let routes;
	function loadRoutes() {
		routes ??= fetch('routes.json')
			.then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
			.then((index) => (game.routes = index))
			.catch((error) => {
				routes = undefined;
				throw error;
			});
		return routes;
	}

	async function run(text) {
		history.push(text);
		recall = history.length;
		transcript.append(el('p', '> ' + text, 'command'));
		try {
			await ensure(game.needs(text));
			if (game.needsRoutes(text)) await loadRoutes();
		} catch {
			return show({ lines: ['The way will not come clear. Try again in a moment.'] });
		}
		const reply = game.respond(text);
		show(reply);
		ahead();
		count('command', { verb: parse(text).verb });
		if (reply.lines.some((line) => line.startsWith('You have walked ')))
			count('distance_mark', { walked: Math.round(game.status().walked) });
	}
	form.addEventListener('submit', (event) => {
		event.preventDefault();
		const text = input.value.trim();
		input.value = '';
		if (text) run(text);
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
	// Guide speaks first; the weather is asked and the world opened while the reader reads.
	show(introduction(HEAD));
	const today = skyNow(HEAD.weatherAt, new Date(), undefined, { weather: settings.weather !== false, air: settings.air !== false });
	if (TILES) {
		const tiled = tiledWorld(HEAD, (key) =>
			fetch(TILES + key + '.json').then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
		);
		ensure = tiled.ensure;
		game = new Adventure(tiled.world);
		await ensure(game.needs('take the tour')).catch(() => {});
	} else game = new Adventure(await openWorld());
	// Saved walks, in this browser: five slots, and the walk kept as it goes.
	game.saves = browserSaves();
	game.offer(await today).forEach(show);
	input.disabled = false;
	if (!location.hash) input.focus({ preventScroll: true });
})();
</script>
${tiles ? '' : `<script type="application/gzip" id="world">${packed(world)}</script>`}
</body>
</html>
`;
}
