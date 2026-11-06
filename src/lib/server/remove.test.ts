import { describe, expect, it } from 'vitest';
import { unhashedScripts } from './csp-check';
import { removalPage } from './remove';
import { structureFaults } from './structure';
import { PAGES, sitemapXml } from './meta';

const words = (html: string) =>
	html
		.replace(/<style>[^]*?<\/style>/, '')
		.replace(/<script>[^]*?<\/script>/g, '')
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ');

describe('removalPage', () => {
	const page = removalPage({ email: 'remove@example.org', date: '2026-11-06' });

	it('is titled for what it does, and is a well-formed page of the site', () => {
		expect(page).toContain('<h1>Remove something</h1>');
		expect(structureFaults(page)).toEqual([]);
		expect(unhashedScripts(page)).toEqual([]);
	});

	it('says what the walk uses and where it comes from', () => {
		for (const name of [
			'OpenStreetMap',
			'Food Standards Agency',
			'London Planning Datahub',
			'HM Land Registry'
		])
			expect(words(page)).toContain(name);
		expect(words(page)).toMatch(/street’s range/);
	});

	it('gives the address to write to, and asks for the street, the place or record, and what to take out', () => {
		expect(page).toContain('href="mailto:remove@example.org"');
		for (const asked of ['the street', 'the place or record', 'what you would like taken out'])
			expect(words(page)).toContain(asked);
	});

	it('asks for no proof, keeps no form, and promises seven days', () => {
		expect(words(page)).toMatch(/no proof/i);
		expect(page).not.toMatch(/<form|<input|<textarea/);
		expect(words(page)).toContain('within 7 days');
	});

	it('says why the address is on another domain than the site’s', () => {
		expect(
			words(removalPage({ email: 'privacy@example.net', siteUrl: 'https://example.org' }))
		).toContain('Benedict’s own address, on another domain');
	});

	it('says how to ask where no address is set', () => {
		expect(removalPage({})).toMatch(/github\.com\/[^"]+\/issues/);
	});

	it('is a page the site names in its sitemap', () => {
		expect(PAGES.remove.path).toBe('/remove/');
		expect(sitemapXml('https://example.org', '2026-11-06')).toContain(
			'https://example.org/remove/'
		);
	});
});
