import { withCsp } from './csp';
import { areaSlug } from '../core/release';
import { COMMANDS, headMeta, homeDescription, jsonLd, PAGES, profileLinks, REPO } from './meta';
import type { News } from './changes';
import { themeBoot, themeCss } from '../site/themes';
import { fontFaces, MONO } from './type';
import type { Ledger } from '../core/adventure/world';
import { faviconLinks, LOCKUP, ogMeta } from '../site/brand';
import { longDate } from '../core/render/words';
import { ADDISCOMBE, consentStrip, placeWords, PRIVACY, robots, type Place } from './export';

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
	/** The place the map is of: Addiscombe, in Croydon, unless told. */
	place?: Place;
	/** Kept out of search engines, as a walk behind a flag is. */
	noindex?: boolean;
	/** The site's own address (`SITE_URL`), for the image shown where it is shared. */
	siteUrl?: string;
	/** The areas a walk may begin in: those open with their first place, those not open yet without. */
	doors?: { name: string; stop?: string }[];
	/** What is new, from the changelog, newest first. */
	news?: News[];
}

const esc = (text: string) =>
	text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const n = (x: number) => x.toLocaleString('en-GB');

/** "A", "A or B", "A, B or C". */
const orList = (items: string[]) =>
	items.length < 2 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} or ${items.at(-1)}`;

/** The front door: what the piece is, a walk as it was played, and the way in. */
export function landingPage({
	snapshotDate,
	about,
	excerpt,
	script,
	gaId,
	place = ADDISCOMBE,
	noindex,
	siteUrl,
	doors = [],
	news = []
}: LandingInput): string {
	const open = doors.filter((d) => d.stop && d.name !== place.name);
	const shut = doors.filter((d) => !d.stop);
	const ways = open.length
		? `\n\t\t<p class="doors">Or begin in ${orList(open.map((d) => `<a href="walk/#${areaSlug(d.name)}">${esc(d.name)}</a>`))}.${
				shut.length ? ` Not open yet: ${shut.map((d) => esc(d.name)).join(', ')}.` : ''
			}</p>`
		: '';
	const played = excerpt
		.map((e) =>
			'said' in e
				? `<p class="command">&gt; ${esc(e.said)}</p>`
				: `${e.title ? `<h2 class="place">${esc(e.title)}</h2>` : ''}${e.lines.map((l) => `<p>${esc(l)}</p>`).join('')}`
		)
		.join('\n\t\t\t');
	return withCsp(
		`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>A Partial Guide</title>${robots(noindex)}
${themeBoot()}
${faviconLinks('/')}
${ogMeta(siteUrl)}
${headMeta({ ...PAGES.home, description: homeDescription(place), siteUrl: noindex ? undefined : siteUrl, site: true })}
${jsonLd('home', noindex ? undefined : siteUrl)}${siteUrl ? '' : '\n<meta name="twitter:card" content="summary">'}
<meta name="theme-color" content="#000000">
<style>
${fontFaces('/')}
	/* As the walk looks: one typeface, light on dark, inverse bars. */
	:root {
		--paper: #000; --ink: #d4d4cc; --bright: #fff; --muted: #8e8e86; --rule: #3a3a36;
		--mono: ${MONO};
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
	.brand svg { display: block; width: min(100%, 22rem); height: auto; margin: 0 0 2.5rem; }
	h1 { color: var(--bright); font-size: clamp(2rem, 8vw, 3.25rem); line-height: 1.1; margin: 0 0 1rem; letter-spacing: -0.02em; }
	.lede { font-size: 1.1rem; color: var(--bright); margin: 0 0 1.75rem; }
	.begin {
		display: inline-block; background: var(--bright); color: var(--paper); text-decoration: none;
		font-weight: bold; padding: 0.7rem 1.2rem; border: 2px solid var(--bright);
	}
	.begin:hover, .begin:focus-visible { background: var(--paper); color: var(--bright); }
	h2 { color: var(--bright); font-size: 1rem; text-transform: uppercase; letter-spacing: 0.08em; margin: 3rem 0 1rem; }
	.played { border: 1px solid var(--rule); padding: 1rem 1.25rem; margin-top: 1rem; }
	.played h2.place { color: var(--bright); font-size: 1rem; margin: 1rem 0 0.5rem; }
	/* What is new: each day a quieter heading under the section's own. */
	h3 { color: var(--ink); font-size: 1rem; font-weight: 700; margin: 1.5rem 0 0.5rem; }
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
${themeCss()}
	/* A link first in the page, seen only when a keyboard reaches it, to skip to what matters. */
	.skip { position: absolute; left: 1rem; top: -4rem; z-index: 10; background: var(--bright); color: var(--paper); padding: 0.6rem 1rem; font-weight: 700; }
	.skip:focus { top: 0.5rem; }
</style>
</head>
<body>
<a class="skip" href="#main">Skip to the content</a>
<div class="bar"><span>A Partial Guide</span><a href="walk/">Start</a></div>
<main id="main">
	<section class="hero">
		<div class="brand">${LOCKUP}</div>
		<h1>The world as a text adventure.</h1>
		<p class="lede">Type a direction and walk. Every street, building, name and date comes from open data.</p>
		<p>It starts with ${esc(placeWords(place))}. Guide’s map has ${n(about.streets)} streets and ${n(about.places)} places, and is dated ${esc(longDate(snapshotDate))}.</p>
		<a class="begin" href="walk/">Start in ${esc(place.name)}</a>${ways}
	</section>

	<div class="played">
			${played}
	</div>

${whatsNewSection(news)}
	<h2>How it works</h2>
	<p>The places are built from OpenStreetMap and public records: food hygiene ratings, planning applications, house sales, listed buildings, bus stops.</p>
	<p>Nothing is made up. Where the data is wrong or missing, the game says so as it stands. A bank whose sign was recorded as “est Bank” is called “est Bank”.</p>
	<p>Some of it is live: the buses due at a stop, today’s weather, the nearest traffic camera.</p>

	<h2>Commands</h2>
	<ul class="commands">
		${COMMANDS.map(([words, rest]) => `<li>${words.map((w) => `<code>${esc(w)}</code>`).join(' ')}${rest ? ` ${esc(rest)}` : ''}</li>`).join('\n\t\t')}
	</ul>

	<p class="again"><a class="begin" href="walk/">Start in ${esc(place.name)}</a></p>

	<footer>
		<p>${gaId ? PRIVACY.counted : PRIVACY.none}</p>
		<p><a href="walk/#about">Sources and licences</a> · <a href="privacy/">Privacy</a> · ${profileLinks()} · <a href="${REPO}">Code</a> · Made by Benedict</p>
	</footer>
</main>
${gaId ? consentStrip('this site', 'privacy/') : ''}
<script>${script}</script>
<script>LandingPage.landing(${JSON.stringify(gaId ?? '')});</script>
</body>
</html>
`,
		{ analytics: !!gaId }
	);
}

/** A changelog line for the page: escaped, with its `code` kept as code. */
const line = (text: string) => esc(text).replace(/`([^`]+)`/g, '<code>$1</code>');

/** What is new, newest first, with a way to every change; nothing when there is nothing to tell. */
function whatsNewSection(news: readonly News[]): string {
	if (!news.length) return '';
	const days = news
		.map(
			(d) =>
				`<h3>${esc(longDate(d.date))}</h3>\n\t<ul>\n\t\t${d.items.map((i) => `<li>${line(i)}</li>`).join('\n\t\t')}\n\t</ul>`
		)
		.join('\n\t');
	return `	<h2>What’s new</h2>\n\t${days}\n\t<p>That is the latest; <a href="${REPO}/blob/main/CHANGELOG.md">all the changes</a> are in the changelog.</p>\n`;
}
