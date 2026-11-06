import { longDate } from '../core/render/words';
import { faviconLinks, LOCKUP } from '../site/brand';
import { SOURCES } from '../site/sources';
import { themeBoot, themeCss } from '../site/themes';
import { withCsp } from './csp';
import { addressNote, headMeta, PAGES, REPO } from './meta';
import { fontFaces, MONO } from './type';

export interface RemovalOptions {
	/** `REMOVAL_EMAIL`, else `CONTACT_EMAIL`: where a request to take something out is written. */
	email?: string;
	/** The day the page's words last changed. */
	date?: string;
	siteUrl?: string;
}

/** The day the page's words last changed: change it with them. */
export const REMOVAL_CHANGED = '2026-11-06';

/** How soon a request is acted on, as the page promises. */
export const REMOVAL_DAYS = 7;

const esc = (text: string) =>
	text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/**
 * "Remove something": what the walk uses, where it comes from, and how a resident asks for
 * something to be taken out. Requests go by email: the site keeps no form, as it collects nothing
 * by default. What is taken out goes on the suppression list (`data/suppressed.json`).
 */
export function removalPage({ email, date = REMOVAL_CHANGED, siteUrl }: RemovalOptions): string {
	const kept = SOURCES.filter((s) => !s.live && s.name !== 'Astronomy Engine')
		.filter((s) => !['satellite.js', 'SunCalc'].includes(s.name))
		.map((s) => `<li><a href="${esc(s.href)}">${esc(s.name)}</a>: ${esc(s.gives)}.</li>`)
		.join('\n\t\t\t');
	const write = email
		? `write to <a href="mailto:${esc(email)}">${esc(email)}</a>${addressNote(email, siteUrl)}`
		: `ask on <a href="${REPO}/issues">GitHub</a>`;
	return withCsp(
		`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Remove something · A Partial Guide</title>
${themeBoot()}
${headMeta({ ...PAGES.remove, siteUrl, site: true })}
${faviconLinks('/')}
<meta name="theme-color" content="#000000">
<style>
${fontFaces('/')}
	:root {
		--paper: #000; --ink: #d4d4cc; --bright: #fff; --muted: #8e8e86;
		--mono: ${MONO};
	}
	html { background: var(--paper); }
	body { margin: 0; background: var(--paper); color: var(--ink); font: 1rem/1.6 var(--mono); }
	a { color: var(--bright); }
	.bar { background: var(--ink); color: var(--paper); padding: 0.35rem 1rem; font-weight: bold; }
	main { max-width: 44rem; margin: 0 auto; padding: 3rem 1rem; }
	.brand svg { display: block; width: min(100%, 16rem); height: auto; margin: 0 0 2.5rem; }
	h1 { color: var(--bright); font-size: 1.25rem; }
	h2 { color: var(--bright); font-size: 1rem; margin-top: 2rem; }
	footer { color: var(--muted); font-size: 0.85rem; margin-top: 3rem; }
${themeCss()}
	.skip { position: absolute; left: 1rem; top: -4rem; z-index: 10; background: var(--bright); color: var(--paper); padding: 0.6rem 1rem; font-weight: 700; }
	.skip:focus { top: 0.5rem; }
</style>
</head>
<body>
<a class="skip" href="#main">Skip to the content</a>
<div class="bar">A Partial Guide</div>
<main id="main">
	<div class="brand">${LOCKUP}</div>
	<h1>Remove something</h1>
	<p>If the walk tells something about your home, or about you, that you would rather it did not, we will take it out. ${email ? `Write to <a href="mailto:${esc(email)}">${esc(email)}</a>.` : `Ask on <a href="${REPO}/issues">GitHub</a>.`}</p>

	<h2>What the walk uses</h2>
	<p>Everything Guide says comes from open data that others keep and publish: the map, and public records of places. Nothing is made up, and nothing comes from you. It uses:</p>
	<ul>
			${kept}
	</ul>
	<p>Some of it is said with care already. A planning application is told by its description, decision and date, never by who applied, and a name in the description is taken out. House sales are told only as a street’s range since a year: the middle 80% of its sales, so neither end is any one house, rounded to the nearest £25,000, and only where a street had at least five sales, never as what one house sold for. A company is told only where it is registered at a shop, office or other premises, never at a home.</p>

	<h2>How to ask</h2>
	<p>To have something taken out, ${write}, and say:</p>
	<ul>
		<li>the street;</li>
		<li>the place or record: a house, a name, a planning application, a business;</li>
		<li>what you would like taken out.</li>
	</ul>
	<p>You need no proof that you live there, and we ask for nothing more. We act on every request within ${REMOVAL_DAYS} days. What is taken out stays out, however often the records are fetched again, and anything already written about it is taken out too. Your email is used only to reply to you.</p>
	<p>To correct the map itself, which anyone may edit, see <a href="https://www.openstreetmap.org/fixthemap">OpenStreetMap</a>; to correct a public record, ask whoever keeps it.</p>

	<footer>
		<p>This page was last changed on ${esc(longDate(date))}.</p>
		<p><a href="/">The start</a> · <a href="/walk/">The walk</a> · <a href="/privacy/">Privacy</a></p>
	</footer>
</main>
</body>
</html>
`
	);
}
