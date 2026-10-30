import type { Ledger } from '../core/adventure/world';
import { longDate } from '../core/render/words';
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
	'The world as a text adventure, built from open data. It starts with Addiscombe, in Croydon.';

/** The front door: what the piece is, a walk as it was played, and the way in. */
export function landingPage({ snapshotDate, about, excerpt, script, gaId }: LandingInput): string {
	const played = excerpt
		.map((e) =>
			'said' in e
				? `<p class="command">&gt; ${esc(e.said)}</p>`
				: `${e.title ? `<h3>${esc(e.title)}</h3>` : ''}${e.lines.map((l) => `<p>${esc(l)}</p>`).join('')}`
		)
		.join('\n\t\t\t');
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
	h2 { color: var(--bright); font-size: 1rem; text-transform: uppercase; letter-spacing: 0.08em; margin: 3rem 0 1rem; }
	.played { border: 1px solid var(--rule); padding: 1rem 1.25rem; margin-top: 1rem; }
	.played h3 { color: var(--bright); font-size: 1rem; margin: 1rem 0 0.5rem; }
	.played p { margin: 0 0 0.75rem; }
	.played .command { color: var(--bright); }
	.commands { list-style: none; padding: 0; margin: 0; }
	.commands li { padding: 0.35rem 0; border-bottom: 1px solid var(--rule); }
	.commands code { margin-right: 1ch; }
	.again { margin-top: 2.5rem; }
	code { color: var(--bright); }
	footer { border-top: 1px solid var(--rule); margin-top: 3rem; padding-top: 1rem; color: var(--muted); font-size: 0.85rem; }
	.consent { position: sticky; bottom: 0; background: var(--paper); border-top: 1px solid var(--rule); padding: 0.75rem 1rem; font-size: 0.85rem; }
	.consent[hidden] { display: none; }
	.consent p { margin: 0 auto; max-width: 44rem; }
	.consent button { font: inherit; margin-left: 0.5ch; }
</style>
</head>
<body>
<div class="bar"><span>A Partial Guide</span><a href="walk/">Start</a></div>
<main>
	<section class="hero">
		<h1>The world as a text adventure.</h1>
		<p class="lede">Type a direction and walk. Every street, building, name and date comes from open data.</p>
		<p>It starts with Addiscombe, in Croydon: ${n(about.streets)} streets and ${n(about.places)} places, from a map dated ${esc(longDate(snapshotDate))}.</p>
		<a class="begin" href="walk/">Start in Addiscombe</a>
	</section>

	<div class="played">
			${played}
	</div>

	<h2>How it works</h2>
	<p>The places are built from OpenStreetMap and public records: food hygiene ratings, planning applications, house sales, listed buildings, bus stops.</p>
	<p>Nothing is made up. Where the data is wrong or missing, the game says so as it stands. A bank whose sign was recorded as “est Bank” is called “est Bank”.</p>
	<p>Some of it is live: the buses due at a stop, today’s weather, the nearest traffic camera.</p>

	<h2>Commands</h2>
	<ul class="commands">
		<li><code>n</code> <code>se</code> <code>back</code></li>
		<li><code>look</code> <code>examine</code> <code>explore</code></li>
		<li><code>route to</code> a street or a place</li>
		<li><code>gps on</code></li>
		<li><code>look up</code> <code>use the camera</code></li>
		<li><code>save</code> <code>restore</code> <code>help</code></li>
	</ul>

	<p class="again"><a class="begin" href="walk/">Start in Addiscombe</a></p>

	<footer>
		<p>${gaId ? PRIVACY.counted : PRIVACY.none}</p>
		<p><a href="walk/#about">Sources and licences</a> · <a href="https://github.com/Benedict/osm-text-adventure">Code</a> · Made by Benedict</p>
	</footer>
</main>
${gaId ? consentStrip('this site') : ''}
<script>${script}</script>
<script>LandingPage.landing(${JSON.stringify(gaId ?? '')});</script>
</body>
</html>
`;
}
