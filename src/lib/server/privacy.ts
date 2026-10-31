import { longDate } from '../core/render/words';
import { faviconLinks, LOCKUP } from '../site/brand';
import { SOURCES } from '../site/sources';
import { themeBoot, themeCss } from '../site/themes';
import { withCsp } from './csp';
import { headMeta, PAGES } from './meta';
import { fontFaces, MONO } from './type';

export interface PrivacyOptions {
	/** The day the page's words last changed. */
	date?: string;
	/** `GA_MEASUREMENT_ID`: with it, visits are counted once the reader says yes. */
	gaId?: string;
	/** `SIGNUP_URL`: the mailing list's own page, if there is one. */
	signupUrl?: string;
	/** `CONTACT_EMAIL`: where the reader may write about their data. */
	contact?: string;
	siteUrl?: string;
}

const esc = (text: string) =>
	text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/**
 * The privacy page: what the site keeps, what it sends and to whom, written from what the code does
 * (`browser/*.ts`, `site/sources.ts`, `browser/analytics.ts`), so it says no more than is true.
 * What is counted and the mailing list are told only where the site has them.
 */
/** The day the page's words last changed: change it with them. */
export const PRIVACY_CHANGED = '2026-10-31';

export function privacyPage({
	date = PRIVACY_CHANGED,
	gaId,
	signupUrl,
	contact,
	siteUrl
}: PrivacyOptions): string {
	const live = SOURCES.filter((s) => s.live && s.live !== 'flights')
		.map((s) => `<li><a href="${esc(s.href)}">${esc(s.name)}</a>: ${esc(s.gives)}.</li>`)
		.join('\n\t\t\t');
	const counting = gaId
		? `<p>If you agree, the site counts your visit with Google Analytics, and only after you say yes: a strip asks once, and Settings can change your answer at any time. It is told which page you opened, on the walk the kind of each command (a step, a look, a route), never what you type, and when you pass a distance mark. Google sets its own cookies to tell one visit from another, and keeps what it is sent under <a href="https://policies.google.com/privacy">its own policy</a>. Without your yes, nothing of Google’s is loaded at all.</p>`
		: `<p>Nothing is counted. The site has no analytics, no advertising and no cookies of its own.</p>`;
	const list = signupUrl
		? `<h2>The mailing list</h2>
		<p>Where the walk stops at an area not open yet, you may <a href="${esc(signupUrl)}">sign up to hear when it opens</a>. You give your email address on the mailing list’s own page, not here, and its provider keeps it under its own policy. It is used only to tell you when new areas open, and every message lets you leave the list.</p>`
		: '';
	const write = contact ? ` Write to <a href="mailto:${esc(contact)}">${esc(contact)}</a>.` : '';
	return withCsp(
		`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Privacy · A Partial Guide</title>
${themeBoot()}
${headMeta({ ...PAGES.privacy, siteUrl, site: true })}
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
	<h1>Privacy</h1>
	<p>In short: you need no account, nothing is asked of you, and Guide never asks where you are. The walk is played in your browser.</p>

	<h2>What stays in your browser</h2>
	<p>The page keeps a few things in your browser’s own storage, so the walk is as you left it: your saved walks, the colours you chose, your Settings, which hints you have been given and whether hints are on, and your answer about counting visits. They are never sent to us, and clearing your browser’s data for this site removes them.</p>

	<h2>What you type</h2>
	<p>Commands are read in the page. A postcode, a place or a latitude and longitude you type to begin a walk is looked up in the page itself, from the map it carries, and sent to no one.</p>

	<h2>Live sources</h2>
	<p>Some of what Guide says is asked as you read, from your browser, for the map’s own places and never for yours. Like any website, each of these sees your IP address and your browser when it is asked:</p>
	<ul>
			${live}
	</ul>
	<p>The aircraft overhead are asked through this site’s own function, so the service that tracks them sees the site, not you. The map beside <code>gps</code> loads its code from jsDelivr. Each source can be turned off in <a href="/walk/#settings">Settings</a>, and then nothing is asked of it.</p>

	<h2>Counting visits</h2>
	${counting}
${list}
	<h2>The site’s host</h2>
	<p>The site is served by Netlify, which, like any host, sees each request’s IP address and keeps records of requests for a short time to run and protect the service, under <a href="https://www.netlify.com/privacy/">its own policy</a>.</p>

	<h2>Your rights</h2>
	<p>Under the UK GDPR you may ask what is held about you, and ask for it to be corrected or erased. The site itself holds nothing about you; what the services above hold, you may ask of them.${write}</p>

	<footer>
		<p>Benedict is responsible for this site. This page was last changed on ${esc(longDate(date))}.</p>
		<p><a href="/">The start</a> · <a href="/walk/">The walk</a></p>
	</footer>
</main>
</body>
</html>
`
	);
}
