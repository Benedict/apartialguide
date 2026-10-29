import { describe, expect, it } from 'vitest';
import { destination, type LatLon } from '../geo';
import { beyondLine, nearestOn } from './beyond';
import { HEARSAY } from './hearsay';

const here: LatLon = [51.38, -0.07];
const at = (bearing: number, metres: number) => destination(here, bearing, metres) as LatLon;

describe('nearestOn', () => {
	it('finds the nearest point along a line, not only at its corners', () => {
		const line = [at(270, 2000), at(0, 0)].map((p) => destination(p, 0, 1000) as LatLon);
		// A line running west to east, 1 km north: nearest due north.
		const { metres, bearing } = nearestOn(line, here);
		expect(Math.round(metres)).toBe(1000);
		expect(Math.round(bearing) % 360).toBe(0);
	});
});

describe('beyondLine', () => {
	const road = {
		name: 'Invented Way to Nowhere?',
		kind: 'a road',
		points: [at(260, 2300), at(280, 2400)],
		source: 'Invented'
	};
	const town = {
		name: 'Inventum',
		kind: 'Vicus - medium',
		points: [at(225, 2100)],
		source: 'Invented'
	};
	const far = { name: 'Far Off', kind: 'fort', points: [at(90, 15000)], source: 'Invented' };

	it('tells what lies beyond the map, nearest first, by name and kind as found, as hearsay', () => {
		const line = beyondLine([road, town, far], here)!;
		expect(line).toMatch(HEARSAY);
		expect(line).toContain(
			'beyond what the map shows, “Inventum”, Vicus - medium, 2.1 km to the south-west; and “Invented Way to Nowhere?”, a road, 2.3 km to the west.'
		);
		expect(line).not.toContain('Far Off');
	});

	it('tells a thing kept in many lengths once, and another name it is kept under', () => {
		const again = { ...road, points: [at(250, 3000), at(240, 3200)] };
		const named = { ...town, name: 'Inventon', also: 'INVENTVM?', points: [at(180, 4000)] };
		const line = beyondLine([road, again, named], here)!;
		expect(line.match(/Invented Way/g)).toHaveLength(1);
		expect(line).toContain('“Inventon”, called “INVENTVM?”, Vicus - medium, 4 km to the south');
	});

	it('tells nothing when nothing lies near enough', () => {
		expect(beyondLine([far], here)).toBeUndefined();
	});
});

describe('distanceWords', () => {
	it('says a whole number of kilometres without a stray tenth', async () => {
		const { distanceWords } = await import('./words');
		expect(distanceWords(1999.9)).toBe('2 km');
		expect(distanceWords(2340)).toBe('2.3 km');
	});
});
