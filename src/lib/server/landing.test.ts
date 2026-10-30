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

	it('leads to the walk', () => {
		expect(html).toMatch(/<a class="begin" href="walk\/"[^>]*>Start in Addiscombe/);
	});

	it('gives the map’s size and date, every figure the data’s', () => {
		const text = html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
		expect(text).toContain('12 streets and 340 places');
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

	it('asks nothing of Google without a measurement ID, and asks first with one', () => {
		expect(html).not.toContain('id="consent"');
		const counted = landingPage({ ...input, gaId: 'G-TEST123' });
		expect(counted).toContain('id="consent"');
		expect(counted).toContain('LandingPage.landing("G-TEST123")');
		expect(counted).not.toContain('googletagmanager');
	});
});
