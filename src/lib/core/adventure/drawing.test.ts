import { describe, expect, it } from 'vitest';
import { drawWalks } from './drawing';

// Invented lines: no real walk.
const square: [number, number][] = [
	[51.38, -0.07],
	[51.381, -0.07],
	[51.381, -0.068],
	[51.38, -0.068]
];

const pointsOf = (svg: string) =>
	[...svg.matchAll(/points="([^"]+)"/g)].map((m) =>
		m[1].split(' ').map((p) => p.split(',').map(Number))
	);

describe('the drawn walk', () => {
	it('is a plain line, unlabelled: no text, no streets, only the walk', () => {
		const svg = drawWalks([square])!;
		expect(svg).toMatch(/^<svg [^>]*viewBox="0 0 \d+ \d+"/);
		expect(svg).not.toMatch(/<text|<title|<path/);
		expect(pointsOf(svg)).toHaveLength(1);
		expect(pointsOf(svg)[0]).toHaveLength(4);
	});

	it('takes the page’s colour, so it is drawn in the reader’s theme', () => {
		expect(drawWalks([square])).toContain('stroke="currentColor"');
		expect(drawWalks([square])).toContain('fill="none"');
	});

	it('keeps north up and the shape true: a step north is drawn up, east is drawn right', () => {
		const [[start, north, east]] = pointsOf(drawWalks([square])!);
		expect(north[1]).toBeLessThan(start[1]);
		expect(north[0]).toBe(start[0]);
		expect(east[0]).toBeGreaterThan(north[0]);
		// 0.001° of latitude is about 111 m; 0.002° of longitude at this latitude about 139 m.
		const tall = start[1] - north[1];
		const wide = east[0] - north[0];
		expect(wide / tall).toBeCloseTo(139 / 111, 1);
	});

	it('draws every walk it is given, each its own line, fitted together', () => {
		const other = square.map(([la, lo]) => [la + 0.002, lo] as [number, number]);
		const lines = pointsOf(drawWalks([square, other])!);
		expect(lines).toHaveLength(2);
		const ys = lines.flat().map(([, y]) => y);
		expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
	});

	it('draws nothing where nothing has been walked', () => {
		expect(drawWalks([])).toBeUndefined();
		expect(drawWalks([[[51.38, -0.07]]])).toBeUndefined();
	});
});
