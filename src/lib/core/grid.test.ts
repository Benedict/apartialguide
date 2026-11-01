import { describe, expect, it } from 'vitest';
import { boxOf, Grid } from './grid';
import type { LatLon } from './geo';

const O: LatLon = [51.0, -0.1];
/** A point so many metres north and east of O, near enough. */
const at = (north: number, east: number): LatLon => [
	O[0] + north / 111_320,
	O[1] + east / (111_320 * Math.cos((O[0] * Math.PI) / 180))
];

describe('Grid', () => {
	it('finds what is filed near a box, and nothing filed far from it', () => {
		const grid = new Grid<string>(400);
		grid.add('near', boxOf([at(100, 100)]));
		grid.add('far', boxOf([at(5000, 0)]));
		expect([...grid.near(boxOf([O], 400))]).toEqual(['near']);
	});

	it('finds a long thing that crosses near, though its ends lie far off', () => {
		const grid = new Grid<string>(400);
		grid.add('line', boxOf([at(300, -3000), at(300, 3000)]));
		expect([...grid.near(boxOf([O], 400))]).toEqual(['line']);
	});

	it('gives each thing once, however many cells it spans', () => {
		const grid = new Grid<number>();
		grid.add(1, boxOf([at(-500, -500), at(500, 500)]));
		expect([...grid.near(boxOf([O], 400))]).toEqual([1]);
	});

	it('widens a box by so many metres each way', () => {
		const [s, w, n, e] = boxOf([O], 100);
		expect(n - s).toBeCloseTo((2 * 100) / 111_320, 8);
		expect(e - w).toBeGreaterThan(n - s);
	});
});
