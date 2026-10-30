import type { Ledger } from '../core/adventure/world';
import { longDate, monthYear } from '../core/render/words';
import { consentStrip, PRIVACY } from './export';

export interface LandingInput {
	/** The snapshot's date, as YYYY-MM-DD. */
	snapshotDate: string;
	/** What Guide carries, from the world: every figure on the page is the data's. */
	about: Ledger;
	/** A walk as it was played when the page was built: a command, or a place told. */
	excerpt: ({ said: string } | { title?: string; lines: string[] })[];
	/** The microsite's script, bundled, defining a global `LandingPage`. */
	script: string;
	/** The Google Analytics measurement ID: counted only once the reader says yes. */
	gaId?: string;
}

const esc = (text: string) =>
	text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const n = (x: number) => x.toLocaleString('en-GB');

const DESCRIPTION =
	'A Partial Guide: a text walk through Addiscombe, Croydon, told from open data by a narrator who knows only what the records say. Where the data is broken, so is Guide.';

/** The front door: what the piece is, a walk as it was played, and the way in. */
export function landingPage({ snapshotDate, about, excerpt, script, gaId }: LandingInput): string {
	const played = excerpt
		.map((e) =>
			'said' in e
				? `<p class="command">&gt; ${esc(e.said)}</p>`
				: `${e.title ? `<h3>${esc(e.title)}</h3>` : ''}${e.lines.map((l) => `<p>${esc(l)}</p>`).join('')}`
		)
		.join('\n\t\t\t');
	const others = about.accounts.length;
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>A Partial Guide</title>
<meta name="description" content="${esc(DESCRIPTION)}">
<meta property="og:title" content="A Partial Guide">
<meta property="og:description" content="${esc(DESCRIPTION)}">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary">
<meta name="theme-color" content="#000000">
<style>
	/* As the walk looks: one typeface, light on dark, inverse bars. */
	:root {
		--paper: #000; --ink: #d4d4cc; --bright: #fff; --muted: #8e8e86; --rule: #3a3a36;
		--mono: ui-monospace, 'SF Mono', Menlo, Consolas, 'Courier New', monospace;
	}
	* { box-sizing: border-box; }
	html { background: var(--paper); }
	body { margin: 0; background: var(--paper); color: var(--ink); font: 1rem/1.6 var(--mono); }
	a { color: var(--bright); }
	.bar {
		position: sticky; top: 0; z-index: 1; display: flex; justify-content: space-between; gap: 1rem;
		background: var(--ink); color: var(--paper); padding: 0.35rem 1rem; font-weight: bold;
	}
	.bar a { color: var(--paper); }
	main { max-width: 44rem; margin: 0 auto; padding: 0 1rem 4rem; }
	.hero { padding: 3.5rem 0 2rem; }
	h1 { color: var(--bright); font-size: clamp(2rem, 8vw, 3.25rem); line-height: 1.1; margin: 0 0 1rem; letter-spacing: -0.02em; }
	.lede { font-size: 1.1rem; color: var(--bright); margin: 0 0 1.75rem; }
	.begin {
		display: inline-block; background: var(--bright); color: var(--paper); text-decoration: none;
		font-weight: bold; padding: 0.7rem 1.2rem; border: 2px solid var(--bright);
	}
	.begin:hover, .begin:focus-visible { background: var(--paper); color: var(--bright); }
	.note { color: var(--muted); font-size: 0.85rem; margin-top: 0.75rem; }
	h2 { color: var(--bright); font-size: 1rem; text-transform: uppercase; letter-spacing: 0.08em; margin: 3rem 0 1rem; }
	.played { border: 1px solid var(--rule); padding: 1rem 1.25rem; }
	.played h3 { color: var(--bright); font-size: 1rem; margin: 1rem 0 0.5rem; }
	.played p { margin: 0 0 0.75rem; }
	.played .command { color: var(--bright); }
	.figures { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr)); gap: 1px; background: var(--rule); border: 1px solid var(--rule); }
	.figures li { background: var(--paper); padding: 1rem; }
	.figures strong { display: block; color: var(--bright); font-size: 1.5rem; }
	dl { margin: 0; }
	dt { color: var(--bright); margin-top: 1rem; }
	dd { margin: 0.25rem 0 0; }
	code { color: var(--bright); }
	footer { border-top: 1px solid var(--rule); margin-top: 3rem; padding-top: 1rem; color: var(--muted); font-size: 0.85rem; }
	.consent { position: sticky; bottom: 0; background: var(--paper); border-top: 1px solid var(--rule); padding: 0.75rem 1rem; font-size: 0.85rem; }
	.consent[hidden] { display: none; }
	.consent p { margin: 0 auto; max-width: 44rem; }
	.consent button { font: inherit; margin-left: 0.5ch; }
</style>
</head>
<body>
<div class="bar"><span>A Partial Guide</span><a href="walk/">Begin the walk</a></div>
<main>
	<section class="hero">
		<h1>A Partial Guide</h1>
		<p class="lede">A walk through Addiscombe, in Croydon, told by Guide, a narrator who knows only what the open records say. Where the data is broken, so is Guide.</p>
		<a class="begin" href="walk/">Begin the walk</a>
		<p class="note">Plays in your browser, on a phone or a desk. Nothing to install.</p>
	</section>

	<h2>A walk, as it was played</h2>
	<div class="played">
			${played}
	</div>

	<h2>What it is</h2>
	<p>A text adventure in the old manner: a place told in words, a prompt, and directions to type. But nothing in it is invented. Every street, name, number and date comes from open data: the map, and the accounts others keep of the same streets. The voice around them is Guide’s.</p>
	<p>Guide never repairs what it finds. A name recorded half-missing is spoken half-missing; a place the map has lost is told as gone; where the records disagree, Guide leaves them disagreeing. Its confusion is earned by the data. It is an art piece, not a game.</p>

	<h2>What Guide carries</h2>
	<ul class="figures">
		<li><strong>${n(about.streets)}</strong> ${about.streets === 1 ? 'named street' : 'named streets'}</li>
		<li><strong>${n(about.places)}</strong> ${about.places === 1 ? 'place to stand' : 'places to stand'}</li>
		<li><strong>${n(others)}</strong> ${others === 1 ? 'other account' : 'other accounts'} kept of the same streets</li>
		${about.oldest ? `<li><strong>${esc(monthYear(about.oldest))}</strong> the oldest thing on the map was last recorded</li>` : ''}
	</ul>
	<p class="note">From a map dated ${esc(longDate(snapshotDate))}.</p>

	<h2>Things to try</h2>
	<dl>
		<dt><code>north</code>, <code>se</code>, <code>back</code></dt><dd>Walk. The goal is distance; Guide marks it as you go.</dd>
		<dt><code>look up</code></dt><dd>The sky over the map’s place now: the weather, the planets, the satellites above the roofs.</dd>
		<dt><code>use the camera</code></dt><dd>What the nearest traffic camera last saw.</dd>
		<dt><code>route to a pub</code></dt><dd>The way there, street by street. You still walk it.</dd>
		<dt><code>gps on</code></dt><dd>A map kept beside the walk.</dd>
		<dt><code>remember</code> a name</dt><dd>Guide will carry it, and may bring it back somewhere else.</dd>
		<dt><code>plainly</code></dt><dd>The same place, told again from the records alone.</dd>
	</dl>

	<p style="margin-top:2.5rem"><a class="begin" href="walk/">Begin the walk</a></p>

	<footer>
		<p>${gaId ? PRIVACY.counted : PRIVACY.none}</p>
		<p>Where Guide’s words come from, and on what terms: <a href="walk/#about">sources and licences</a>. Made by Benedict. The code is on <a href="https://github.com/Benedict/osm-text-adventure">GitHub</a>.</p>
	</footer>
</main>
${gaId ? consentStrip('this site') : ''}
<script>${script}</script>
<script>LandingPage.landing(${JSON.stringify(gaId ?? '')});</script>
</body>
</html>
`;
}
