import { describe, expect, it } from 'vitest';
import { destination, type LatLon } from '../core/geo';
import {
	boundariesFrom,
	riverCount,
	riverReport,
	waterwaysFrom,
	type Boundary,
	type Waterway
} from './rivers';

// Two invented boroughs side by side, and invented rivers: no real place.
const O: LatLon = [51.5, -0.1];
const box = (west: number, east: number): LatLon[] => {
	const nw = destination(destination(O, 0, 1000), 90, west);
	const se = destination(destination(O, 180, 1000), 90, east);
	return [
		[nw[0], nw[1]],
		[nw[0], se[1]],
		[se[0], se[1]],
		[se[0], nw[1]],
		[nw[0], nw[1]]
	];
};
const boroughs: Boundary[] = [
	{ name: 'Inventon', rings: [box(-2000, 0)] },
	{ name: 'Fabrica', rings: [box(0, 2000)] }
];
const line = (from: number, to: number): LatLon[] => [
	destination(O, 90, from),
	destination(O, 90, to)
];

describe('riverCount', () => {
	const ways: Waterway[] = [
		{ name: 'Inventa Brook', tunnel: true, line: line(-1500, -500) },
		{ name: 'Inventa Brook', tunnel: false, line: line(-500, -100) },
		{ name: 'Fabric Ditch', tunnel: true, line: line(500, 900) },
		{ name: undefined, tunnel: true, line: line(1000, 1500) }
	];

	it('counts each named river above and below ground, in the borough where each stretch lies', () => {
		const rows = riverCount(ways, boroughs);
		const brook = rows.find((r) => r.name === 'Inventa Brook' && r.borough === 'Inventon')!;
		expect(Math.round(brook.under)).toBe(1000);
		expect(Math.round(brook.open)).toBe(400);
		expect(rows.find((r) => r.name === 'Fabric Ditch')!.borough).toBe('Fabrica');
		expect(rows.some((r) => r.name === undefined)).toBe(false);
	});

	it('reports by borough, the most buried first, with the unnamed left out and London’s totals', () => {
		const report = riverReport(riverCount(ways, boroughs), '2026-11-09');
		expect(report).toContain('| Inventon | 1 | 1,000 m |');
		expect(report.indexOf('Inventon')).toBeLessThan(report.indexOf('Fabrica'));
		expect(report).toContain('Inventa Brook');
		expect(report).toContain('2026-11-09');
	});
});

describe('reading the exported map', () => {
	it('reads waterways and boroughs from GeoJSON, one feature a line, as osmium writes them', () => {
		const RS = '\u001e';
		const water = [
			`${RS}{"type":"Feature","geometry":{"type":"LineString","coordinates":[[-0.1,51.5],[-0.09,51.5]]},"properties":{"waterway":"stream","name":"Inventa Brook","tunnel":"culvert"}}`,
			`${RS}{"type":"Feature","geometry":{"type":"Point","coordinates":[-0.1,51.5]},"properties":{"waterway":"weir"}}`
		].join('\n');
		const [way] = waterwaysFrom(water);
		expect(way).toEqual({
			name: 'Inventa Brook',
			tunnel: true,
			line: [
				[51.5, -0.1],
				[51.5, -0.09]
			]
		});
		const edges = `{"type":"Feature","geometry":{"type":"MultiPolygon","coordinates":[[[[-0.2,51.4],[0,51.4],[0,51.6],[-0.2,51.4]]]]},"properties":{"name":"Inventon","admin_level":"8"}}`;
		expect(boundariesFrom(edges)).toEqual([
			{
				name: 'Inventon',
				rings: [
					[
						[51.4, -0.2],
						[51.4, 0],
						[51.6, 0],
						[51.4, -0.2]
					]
				]
			}
		]);
	});
});
