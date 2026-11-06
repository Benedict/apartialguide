import { unhashedScripts } from './csp-check';
import { structureFaults } from './structure';
import { describe, expect, it } from 'vitest';
import { landingPage } from './landing';

// An invented ledger and transcript: the page takes both from the world it is built with.
const input = {
	snapshotDate: '2026-10-25',
	about: {
		streets: 12,
		places: 340,
		oldest: '2009-03-14',
		accounts: ['Food Standards Agency', 'Wikidata']
	},
	excerpt: [
		{ said: 'take the tour' },
		{ title: 'Long Street and Short Row', lines: ['Long Street meets Short Row <here>.'] }
	],
	script: 'var LandingPage = {};'
};

describe('landingPage', () => {
	const html = landingPage(input);

	it('links to Remove something from its footer', () => {
		expect(html.match(/<footer>[^]*?<\/footer>/)![0]).toContain('href="remove/"');
	});

	it('is called A Partial Guide, and says what it is', () => {
		expect(html).toContain('<title>A Partial Guide</title>');
		expect(html).toMatch(/<meta name="description" content="[^"]*Addiscombe[^"]*">/);
		expect(html).toContain('<meta property="og:title" content="A Partial Guide">');
	});

	it('says plainly what it is for: the world as a text adventure, starting with one place', () => {
		const text = html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
		expect(text).toContain('The world as a text adventure.');
		expect(text).toContain('It starts with Addiscombe');
		expect(text).not.toMatch(/art piece|as it was played|earned by the data/);
	});

	it('starts wherever the map it is built with is, and says so everywhere it names the place', () => {
		const croydon = landingPage({ ...input, place: { name: 'Croydon' } });
		expect(croydon).not.toContain('Addiscombe');
		expect(croydon).toContain('Start in Croydon');
		expect(croydon).toMatch(/<meta name="description" content="[^"]*starts with Croydon\.[^"]*">/);
		expect(landingPage({ ...input, place: { name: 'Inventa', within: 'Testshire' } })).toContain(
			'It starts with Inventa, in Testshire. Guide’s map'
		);
	});

	it('keeps a walk behind a flag out of search engines, and only then', () => {
		expect(html).not.toContain('noindex');
		expect(landingPage({ ...input, noindex: true })).toContain(
			'<meta name="robots" content="noindex">'
		);
		const hidden = landingPage({ ...input, noindex: true, siteUrl: 'https://example.org' });
		expect(hidden).not.toContain('rel="canonical"');
		expect(hidden).not.toContain('application/ld+json');
	});

	it('carries the brand: the icon, the mark and name at the top, and the preview image where the address is known', () => {
		expect(html).toContain('<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,');
		expect(html).toContain('<link rel="apple-touch-icon" href="/apple-touch-icon.png">');
		expect(html).toMatch(/class="brand"[^>]*>\s*<svg[^>]*aria-label="A Partial Guide"/);
		expect(html).not.toContain('og:image');
		expect(landingPage({ ...input, siteUrl: 'https://example.org' })).toContain(
			'content="https://example.org/og.png"'
		);
	});

	it('takes the reader’s colours before it is drawn', () => {
		expect(html.indexOf("localStorage.getItem('a-partial-guide:theme')")).toBeLessThan(
			html.indexOf('<body')
		);
		expect(html).toContain(':root[data-theme="amber"]');
	});

	it('is set in Commit Mono, served from the site', () => {
		expect(html).toContain("url('/fonts/commit-mono-400.woff2')");
		expect(html).toContain("--mono: 'Commit Mono',");
	});

	it('can be read by everyone: headings in order, a main, and a skip link to it', () => {
		expect(structureFaults(html)).toEqual([]);
	});

	it('runs only the scripts it was built with', () => {
		expect(unhashedScripts(html)).toEqual([]);
		expect(unhashedScripts(landingPage({ ...input, gaId: 'G-TEST123' }))).toEqual([]);
		expect(landingPage({ ...input, gaId: 'G-TEST123' })).toMatch(
			/script-src [^;]*https:\/\/www\.googletagmanager\.com/
		);
	});

	it('says once what it is, where it lives, and what it is to search engines, and lists colour among the commands', () => {
		const known = landingPage({ ...input, siteUrl: 'https://example.org' });
		expect(known.match(/name="description"/g)).toHaveLength(1);
		expect(known.match(/property="og:title"/g)).toHaveLength(1);
		expect(known).toContain('<link rel="canonical" href="https://example.org/">');
		expect(known).toContain('"@type":"WebSite"');
		expect(known).toContain('<link rel="manifest" href="/site.webmanifest">');
		expect(html).toContain('<meta name="color-scheme" content="dark">');
		expect(html).toContain('<code>colour green</code>');
	});

	it('leads to the walk', () => {
		expect(html).toMatch(/<a class="begin" href="walk\/"[^>]*>Start in Addiscombe/);
	});

	it('gives the map’s size and date, every figure the data’s', () => {
		const text = html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
		expect(text).toContain('Guide’s map has 12 streets and 340 places');
		// The map may be larger than the place the walk starts in: its figures are the map's.
		expect(text).not.toContain('Addiscombe, in Croydon: 12 streets');
		expect(text).toContain('25 October 2026');
	});

	it('shows a walk as it was played, escaped', () => {
		expect(html).toContain('&gt; take the tour');
		expect(html).toContain('Long Street meets Short Row &lt;here&gt;.');
	});

	it('names no source in Guide’s voice, but leads to where they are credited', () => {
		expect(html).not.toContain('Food Standards Agency');
		expect(html).toContain('href="walk/#about"');
	});

	it('leads to the privacy page', () => {
		expect(html).toContain('href="privacy/"');
	});

	it('leads to the walk’s profile on Instagram', () => {
		expect(html).toContain(
			'<a rel="me" href="https://www.instagram.com/apartialguide">Instagram</a>'
		);
	});

	it('asks nothing of Google without a measurement ID, and asks first with one', () => {
		expect(html).not.toContain('id="consent"');
		const counted = landingPage({ ...input, gaId: 'G-TEST123' });
		expect(counted).toContain('id="consent"');
		expect(counted).toContain('LandingPage.landing("G-TEST123")');
		// Its policy may allow Google's script, for after a yes; the page itself loads none.
		expect(counted).not.toMatch(/<script[^>]*googletagmanager/);
	});

	it('offers each open area as a way in, and names those not open yet', () => {
		const doored = landingPage({
			...input,
			doors: [
				{ name: 'Inventa', stop: 'a' },
				{ name: 'Outer Inventa', stop: 'c' },
				{ name: 'Elsewhere' }
			]
		});
		// The place the walk starts in is the button already; the others are offered beside it.
		const doubled = landingPage({
			...input,
			place: { name: 'Inventa' },
			doors: [
				{ name: 'Inventa', stop: 'a' },
				{ name: 'Outer Inventa', stop: 'c' },
				{ name: 'Inner Inventa', stop: 'd' }
			]
		}).replace(/<[^>]+>/g, '');
		expect(doubled).toContain('Or begin in Outer Inventa or Inner Inventa.');
		expect(doored).toContain('<a href="walk/#outer-inventa">Outer Inventa</a>');
		expect(doored).not.toContain('walk/#elsewhere');
		expect(doored.replace(/<[^>]+>/g, '')).toContain('Not open yet: Elsewhere.');
		expect(html).not.toContain('class="doors"');
	});

	it('says what is new, newest first, in the walkers’ words, with a way to every change', () => {
		const page = landingPage({
			...input,
			news: [
				{
					date: '2026-12-02',
					items: ['You can now walk the whole of Inventa.', 'Guide reads <words>.']
				},
				{ date: '2026-11-14', items: ['A new way in, with `code`.'] }
			]
		});
		expect(page).toContain('<h2>What’s new</h2>');
		expect(page).toContain('2 December 2026');
		expect(page).toContain('<li>You can now walk the whole of Inventa.</li>');
		expect(page).toContain('Guide reads &lt;words&gt;.');
		expect(page).toContain('with <code>code</code>.');
		expect(page).toContain('CHANGELOG.md">all the changes</a> are in the changelog.');
		expect(page.indexOf('2 December 2026')).toBeLessThan(page.indexOf('14 November 2026'));
		expect(structureFaults(page)).toEqual([]);
	});

	it('leaves out what is new when there is nothing to tell', () => {
		expect(landingPage(input)).not.toContain('What’s new');
	});

	it('offers the mailing list, its form opened only when the reader presses for it', () => {
		const html = landingPage({ ...input, signup: 'https://inventa.substack.com' });
		expect(html).toContain('Hear what’s new');
		expect(html).toContain('href="https://inventa.substack.com"');
		expect(html).toContain('data-frame="https://inventa.substack.com/embed"');
		// Nothing of the list's provider is asked before the press: no frame, no script, no picture.
		expect(html).not.toMatch(/<iframe|src="https:\/\/inventa/);
		expect(html).toContain('frame-src https://inventa.substack.com');
	});

	it('links any other list, and offers none without one', () => {
		const linked = landingPage({ ...input, signup: 'https://buttondown.com/inventa' });
		expect(linked).toContain('href="https://buttondown.com/inventa"');
		expect(linked).not.toContain('data-frame');
		expect(linked).not.toContain('frame-src');
		expect(landingPage(input)).not.toContain('Hear what’s new');
	});
});
