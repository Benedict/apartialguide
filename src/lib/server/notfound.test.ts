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
		expect(html).not.toMatch(/href="(?!\/|https:)/);
	});

	it('is kept out of search engines, and asks nothing of anyone else', () => {
		expect(html).toContain('<meta name="robots" content="noindex">');
		expect(html).not.toMatch(/<script|googletagmanager|https?:\/\/(?!www\.w3)/);
	});

	it('says nothing of a place: it is the page speaking, not Guide', () => {
		expect(text).not.toMatch(/Addiscombe|Croydon|Guide says/);
	});
});
