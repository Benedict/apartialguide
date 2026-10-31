import { describe, expect, it } from 'vitest';
import { headMeta, jsonLd, llmsTxt, manifest, robotsTxt, sitemapXml, PAGES } from './meta';

const SITE = 'https://example.org';

describe('the head of a page', () => {
	it('says what the page is, that it is dark, and where it lives, once the site knows its address', () => {
		const head = headMeta({ ...PAGES.walk, siteUrl: SITE, site: true });
		expect(head).toContain(`<meta name="description" content="${PAGES.walk.description}">`);
		expect(head).toContain('<meta name="color-scheme" content="dark">');
		expect(head).toContain('<link rel="canonical" href="https://example.org/walk/">');
		expect(head).toContain('<meta property="og:url" content="https://example.org/walk/">');
		expect(head).toContain('<meta property="og:title" content="A Partial Guide">');
		expect(head).toContain('<meta property="og:type" content="website">');
		expect(head).toContain('<link rel="manifest" href="/site.webmanifest">');
	});

	it('names the manifest only where the site serves it, not in the page that plays from one file', () => {
		expect(headMeta(PAGES.walk)).not.toContain('manifest');
	});

	it('names no address it does not know, and none for a page that is nowhere', () => {
		expect(headMeta(PAGES.home)).not.toMatch(/canonical|og:url/);
		expect(headMeta({ ...PAGES.missing, siteUrl: SITE })).not.toMatch(/canonical|og:url/);
	});

	it('gives each page its own description', () => {
		const said = Object.values(PAGES).map((p) => p.description);
		expect(new Set(said).size).toBe(said.length);
	});
});

describe('the site’s own files', () => {
	it('lets every crawler in, and points to the sitemap where the address is known', () => {
		expect(robotsTxt()).toMatch(/^User-agent: \*\nAllow: \/\n$/);
		expect(robotsTxt(SITE)).toContain('Sitemap: https://example.org/sitemap.xml');
	});

	it('lists the pages worth finding, in full', () => {
		const xml = sitemapXml(SITE, '2026-10-25');
		expect(xml).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>/);
		expect(xml).toContain('<loc>https://example.org/</loc>');
		expect(xml).toContain('<loc>https://example.org/walk/</loc>');
		expect(xml).toContain('<lastmod>2026-10-25</lastmod>');
		expect(xml).not.toContain('404');
	});

	it('tells agents what the walk is, how it is played and where its words come from, in Markdown', () => {
		const txt = llmsTxt(SITE);
		expect(txt).toMatch(/^# A Partial Guide\n\n> /);
		expect(txt).toContain('https://example.org/walk/');
		expect(txt).toContain('OpenStreetMap');
		expect(txt).toContain('© OpenStreetMap contributors, ODbL');
		expect(txt).toMatch(/never invent/i);
	});

	it('can be installed: a name, a start, its colours and icons, one of them maskable', () => {
		const m = JSON.parse(manifest());
		expect(m).toMatchObject({
			name: 'A Partial Guide',
			short_name: 'A Partial Guide',
			start_url: '/walk/',
			display: 'standalone',
			background_color: '#000000',
			theme_color: '#000000'
		});
		expect(m.icons.map((i: { sizes: string }) => i.sizes)).toEqual(
			expect.arrayContaining(['192x192', '512x512'])
		);
		expect(m.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);
	});

	it('describes the site and the walk to search engines as structured data, only as they are', () => {
		const site = JSON.parse(
			jsonLd('home', SITE).replace(/^<script type="application\/ld\+json">|<\/script>$/g, '')
		);
		expect(site).toMatchObject({
			'@context': 'https://schema.org',
			'@type': 'WebSite',
			name: 'A Partial Guide',
			url: 'https://example.org/',
			sameAs: ['https://www.instagram.com/apartialguide']
		});
		const game = JSON.parse(
			jsonLd('walk', SITE).replace(/^<script type="application\/ld\+json">|<\/script>$/g, '')
		);
		expect(game).toMatchObject({
			'@type': 'VideoGame',
			genre: 'Text adventure',
			isAccessibleForFree: true,
			url: 'https://example.org/walk/'
		});
		expect(jsonLd('walk')).toBe('');
	});
});
