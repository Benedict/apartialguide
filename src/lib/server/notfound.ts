import { withCsp } from './csp';
import { headMeta, PAGES } from './meta';
import { themeBoot, themeCss } from '../site/themes';
import { fontFaces, MONO } from './type';
import { faviconLinks, LOCKUP } from '../site/brand';

/**
 * The page for a path the site does not have (Netlify serves `404.html` for any). It is the page
 * speaking, as a text adventure does at a wall, not Guide: it says nothing of any place. Its links
 * go from the root, as it may be served at any depth.
 */
export function notFoundPage(): string {
	return withCsp(
		`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>A Partial Guide</title>
${themeBoot()}
<meta name="robots" content="noindex">
${headMeta({ ...PAGES.missing, site: true })}
${faviconLinks('/')}
<meta name="theme-color" content="#000000">
<style>
${fontFaces('/')}
	/* As the walk looks: one typeface, light on dark, an inverse bar. */
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
	.command { color: var(--bright); }
	.quiet { color: var(--muted); font-size: 0.85rem; margin-top: 3rem; }
	.reply { color: var(--bright); font-size: 1.25rem; font-weight: 400; margin: 0.5rem 0 2rem; }
${themeCss()}
	/* A link first in the page, seen only when a keyboard reaches it, to skip to what matters. */
	.skip { position: absolute; left: 1rem; top: -4rem; z-index: 10; background: var(--bright); color: var(--paper); padding: 0.6rem 1rem; font-weight: 700; }
	.skip:focus { top: 0.5rem; }
</style>
</head>
<body>
<a class="skip" href="#main">Skip to the content</a>
<div class="bar">A Partial Guide</div>
<main id="main">
	<div class="brand">${LOCKUP}</div>
	<p class="command">&gt; go there</p>
	<h1 class="reply">You can't go that way.</h1>
	<p>There is no page here. <a href="/walk/">Take up the walk</a>, or go back to <a href="/">the start</a>.</p>
	<p class="quiet"><a href="/privacy/">Privacy</a> · <a href="/remove/">Remove something</a></p>
</main>
</body>
</html>
`
	);
}
