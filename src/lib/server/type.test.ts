import { describe, expect, it } from 'vitest';
import { FONT_FILES, fontFaces, MONO } from './type';

describe('the type', () => {
	it('sets everything in Commit Mono, falling back to the reader’s own monospace', () => {
		expect(MONO).toMatch(/^'Commit Mono', /);
		expect(MONO).toMatch(/monospace$/);
	});

	it('serves the regular and the bold from the site, swapping in once loaded so the first words are never held up', () => {
		const css = fontFaces('/');
		expect(css).toContain("url('/fonts/commit-mono-400.woff2') format('woff2')");
		expect(css).toContain("url('/fonts/commit-mono-700.woff2') format('woff2')");
		expect(css.match(/font-display: swap/g)).toHaveLength(2);
		expect(FONT_FILES).toEqual(['commit-mono-400.woff2', 'commit-mono-700.woff2', 'OFL.txt']);
	});

	it('carries the fonts inside a page that plays from a single file', () => {
		const css = fontFaces();
		expect(css).toMatch(/url\(data:font\/woff2;base64,[A-Za-z0-9+/=]{1000,}\) format\('woff2'\)/);
		expect(css).not.toContain('/fonts/');
	});
});
