import { describe, expect, it } from 'vitest';
import { drawnAround, type Drawing } from './drawing';

// An invented country: a sure road through the place, a conjectured one, a wall, and a road far off.
const drawing: Drawing = {
	lines: [
		{
			kind: 'road',
			sure: 3,
			points: [
				[51, -0.05],
				[51, 0.05]
			]
		},
		{
			kind: 'road',
			sure: 1,
			points: [
				[50.98, 0],
				[51.02, 0]
			]
		},
		{
			kind: 'wall',
			points: [
				[51.01, -0.03],
				[51.01, 0.03]
			]
		},
		{
			kind: 'road',
			sure: 3,
			points: [
				[53, 2],
				[53.1, 2]
			]
		}
	],
	sites: [
		{ name: 'Inventon', at: [51, 0] },
		{ name: 'Far & Away <Fort>', at: [53, 2] }
	]
};

describe('drawnAround (a place on a map drawn from the walk’s own data)', () => {
	const svg = drawnAround(drawing, [51, 0], 'Inventon', 6000);

	it('draws an image that names the place, with no request of anyone', () => {
		expect(svg).toMatch(/^<svg [^>]*role="img"[^>]*aria-label="Inventon"/);
		expect(svg).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
	});

	it('draws a road as sure as it is kept: solid, dashed or dotted', () => {
		const paths = svg.match(/<path [^>]*>/g)!;
		expect(
			paths.filter((p) => p.includes('data-sure="3"') && !p.includes('dasharray'))
		).toHaveLength(1);
		expect(
			paths.filter((p) => p.includes('data-sure="1"') && p.includes('dasharray'))
		).toHaveLength(1);
		expect(paths.filter((p) => p.includes('data-kind="wall"'))).toHaveLength(1);
	});

	it('leaves out what lies beyond the frame', () => {
		expect(svg.match(/<path /g)).toHaveLength(3);
		expect(svg).not.toContain('Far &amp; Away');
	});

	it('marks the place itself at the middle, in the page’s colours', () => {
		expect(svg).toContain('<circle cx="160" cy="160"');
		expect(svg).toContain('var(--accent');
		expect(svg).toContain('var(--ink');
	});
});
