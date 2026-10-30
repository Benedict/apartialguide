import { describe, expect, it } from 'vitest';
import { COLOURS } from '../core/adventure/colours';
import { contrast, THEMES, themeBoot, themeCss } from './themes';

describe('the colours', () => {
	it('offers the page as it is, and green, amber and red as on a terminal: the colours the game knows', () => {
		expect(THEMES.map((t) => t.key)).toEqual([...COLOURS]);
	});

	it('measures contrast as WCAG does', () => {
		expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 0);
		expect(contrast('#777777', '#ffffff')).toBeCloseTo(4.48, 1);
	});

	for (const t of THEMES)
		it(`keeps ${t.label} readable for a long walk: AAA for the text, AA for the quieter words`, () => {
			expect(contrast(t.ink, t.paper)).toBeGreaterThanOrEqual(7);
			expect(contrast(t.bright, t.paper)).toBeGreaterThanOrEqual(7);
			expect(contrast(t.muted, t.paper)).toBeGreaterThanOrEqual(4.5);
			expect(contrast(t.rule, t.paper)).toBeGreaterThanOrEqual(1.5);
		});

	it('writes each colour but the first as the page’s variables under its name', () => {
		const css = themeCss();
		expect(css).not.toContain('[data-theme="paper"]');
		expect(css).toMatch(
			/:root\[data-theme="green"\] \{ --paper: #[0-9a-f]{6}; --ink: #[0-9a-f]{6};/
		);
		expect(css).toContain(':root[data-theme="red"]');
	});

	it('sets the reader’s colours before the page is drawn, so it never flashes the wrong ones', () => {
		const boot = themeBoot();
		expect(boot).toMatch(
			/^<script>[^<]*localStorage\.getItem\('a-partial-guide:theme'\)[^<]*<\/script>$/
		);
		expect(boot).toContain('dataset.theme');
		expect(boot).toContain('catch');
	});
});
