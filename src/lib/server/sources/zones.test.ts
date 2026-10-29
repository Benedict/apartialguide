import { describe, expect, it } from 'vitest';
import { zoneAreas, floodZoneName, recordedFloodName } from './zones';

const square = (x: number, y: number) => [
	[
		[x, y],
		[x + 1, y],
		[x + 1, y + 1],
		[x, y]
	]
];

describe('zoneAreas', () => {
	it('takes each feature’s outer rings, latitude first, named and kinded as told', () => {
		const areas = zoneAreas(
			[
				{
					id: 'a',
					properties: { zone: 'FZ3' },
					geometry: { type: 'Polygon', coordinates: square(0, 1) }
				},
				{
					id: 'b',
					properties: { zone: 'FZ2' },
					geometry: { type: 'MultiPolygon', coordinates: [square(0, 1), square(5, 6)] }
				},
				{ id: 'c', properties: {}, geometry: { type: 'Polygon', coordinates: square(0, 1) } }
			],
			'flood zone',
			(p) => (p.zone ? `zone ${p.zone}` : undefined)
		);
		expect(areas.map((a) => [a.id, a.name, a.kind, a.rings.length, a.rings[0][0]])).toEqual([
			['a', 'zone FZ3', 'flood zone', 1, [1, 0]],
			['b', 'zone FZ2', 'flood zone', 2, [1, 0]]
		]);
	});
});

describe('flood names, from what the maps record', () => {
	it('names a flood zone as the map gives it', () => {
		expect(floodZoneName({ flood_zone: 'FZ3' })).toBe('flood zone FZ3');
		expect(floodZoneName({ flood_zone: 'Flood Zone 2' })).toBe('Flood Zone 2');
		expect(floodZoneName({})).toBeUndefined();
	});

	it('names a recorded flood by the month it began', () => {
		expect(recordedFloodName({ start_date: '1968-09-14T00:00:00Z' })).toBe(
			'the flood of September 1968'
		);
		expect(recordedFloodName({ start_date: null })).toBeUndefined();
	});
});
