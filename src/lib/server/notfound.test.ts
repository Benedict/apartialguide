import { unhashedScripts } from './csp-check';
import { structureFaults } from './structure';
import { describe, expect, it } from 'vitest';
import { notFoundPage } from './notfound';

describe('notFoundPage', () => {
	const html = notFoundPage();
	const text = html.replace(/<style>[^]*?<\/style>/, '').replace(/<[^>]+>/g, ' ');

	it('says, as a text adventure would, that there is no way there', () => {
		expect(html).toContain('<title>A Partial Guide</title>');
		expect(text).toContain("You can't go that way.");
	});

	it('leads back from wherever it is served, by paths from the root', () => {
		expect(html).toContain('href="/"');
		expect(html).toContain('href="/walk/"');
		expect(html).not.toMatch(/href="(?!\/|https:|data:image|#)/);
	});

	it('carries the icon and the mark', () => {
		expect(html).toContain('<link rel="icon" type="image/svg+xml"');
		expect(html).toContain('aria-label="A Partial Guide"');
	});

	it('takes the reader’s colours before it is drawn', () => {
		expect(html.indexOf("localStorage.getItem('a-partial-guide:theme')")).toBeLessThan(
			html.indexOf('<body')
		);
		expect(html).toContain(':root[data-theme="green"]');
	});

	it('is set in Commit Mono, served from the site', () => {
		expect(html).toContain("url('/fonts/commit-mono-700.woff2')");
		expect(html).toContain("--mono: 'Commit Mono',");
	});

	it('can be read by everyone: headings in order, a main, and a skip link to it', () => {
		expect(structureFaults(html)).toEqual([]);
	});

	it('runs only the scripts it was built with', () => {
		expect(unhashedScripts(html)).toEqual([]);
	});

	it('is kept out of search engines, and asks nothing of anyone else', () => {
		expect(html).toContain('<meta name="robots" content="noindex">');
		expect(html).not.toMatch(/googletagmanager/);
		expect(html.match(/<script>/g)).toHaveLength(1);
	});

	it('says nothing of a place: it is the page speaking, not Guide', () => {
		expect(text).not.toMatch(/Addiscombe|Croydon|Guide says/);
	});
});
