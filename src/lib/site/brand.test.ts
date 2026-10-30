import { describe, expect, it } from 'vitest';
import { faviconLinks, LOCKUP, MARK, ogMeta } from './brand';

describe('the brand', () => {
	it('draws the mark, a junction of three streets and a gap turned to a prompt, in shapes alone', () => {
		expect(MARK).toMatch(/^<svg [^>]*viewBox="-50 -50 100 100"/);
		expect(MARK.match(/<path /g)).toHaveLength(4);
		expect(MARK).toContain('stroke-dasharray');
		expect(MARK).toContain('<circle');
	});

	it('sets the name beside it as shapes, so it looks the same on every device', () => {
		expect(LOCKUP).toContain('role="img"');
		expect(LOCKUP).toContain('aria-label="A Partial Guide"');
		expect(LOCKUP).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="0 0 \d+ 112"/);
		expect(LOCKUP).not.toContain('<text');
		expect(LOCKUP).not.toMatch(/font-family/);
	});

	it('takes the page’s colours in the mark and name on a page, and keeps its own in the icon', () => {
		expect(LOCKUP).toContain('var(--ink');
		expect(LOCKUP).toContain('var(--bright');
		expect(MARK).not.toContain('var(');
	});

	it('gives the page its icon in the page itself, and the home-screen icon where the site serves it', () => {
		const links = faviconLinks();
		expect(links).toMatch(
			/<link rel="icon" type="image\/svg\+xml" href="data:image\/svg\+xml,[^"]+">/
		);
		expect(links).not.toContain('apple-touch-icon');
		expect(faviconLinks('/')).toContain(
			'<link rel="apple-touch-icon" href="/apple-touch-icon.png">'
		);
	});

	it('names a preview image only where the site knows its own address', () => {
		expect(ogMeta()).toBe('');
		expect(ogMeta('https://example.org')).toContain(
			'<meta property="og:image" content="https://example.org/og.png">'
		);
		expect(ogMeta('https://example.org/')).toContain('content="https://example.org/og.png"');
		expect(ogMeta('https://example.org')).toContain(
			'<meta name="twitter:card" content="summary_large_image">'
		);
	});
});
