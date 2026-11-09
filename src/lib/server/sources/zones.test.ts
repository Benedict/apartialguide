import { describe, expect, it } from 'vitest';
import {
	zoneAreas,
	floodZoneName,
	recordedFloodName,
	heritageAreas,
	featuresInBox,
	entitiesOf
} from './zones';

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

describe('heritage areas and entities from planning.data.gov.uk’s files', () => {
	it('kinds each dataset, keeps a park’s grade, and leaves out what has ended', () => {
		const areas = heritageAreas(
			[
				{
					properties: { entity: '1', name: 'Inventon Green', 'end-date': '' },
					geometry: { type: 'Polygon', coordinates: square(0, 1) }
				},
				{
					properties: { entity: '2', name: 'Gone Green', 'end-date': '2020-01-01' },
					geometry: { type: 'Polygon', coordinates: square(0, 1) }
				}
			],
			'conservation-area'
		);
		expect(areas.map((a) => [a.id, a.name, a.kind])).toEqual([
			['1', 'Inventon Green', 'conservation area']
		]);
		const [park] = heritageAreas(
			[
				{
					properties: { entity: '3', name: 'INVENTON HALL', 'park-and-garden-grade': 'II*' },
					geometry: { type: 'MultiPolygon', coordinates: [square(0, 1)] }
				}
			],
			'park-and-garden'
		);
		expect([park.kind, park.claims]).toEqual(['registered park and garden', { grade: 'II*' }]);
	});

	it('keeps only the areas that reach into the box', () => {
		const features = [
			{
				properties: { entity: 'in', name: 'In' },
				geometry: { type: 'Polygon', coordinates: square(0, 1) }
			},
			{
				properties: { entity: 'out', name: 'Out' },
				geometry: { type: 'Polygon', coordinates: square(9, 9) }
			}
		];
		expect(featuresInBox(features, '0.5,1.5,2,3').map((f) => f.properties?.entity)).toEqual(['in']);
	});

	it('reads a file’s point features as the entities the search would give', () => {
		expect(
			entitiesOf([
				{
					properties: { entity: '7', name: 'Inventon Pump', dataset: 'listed-building' },
					geometry: { type: 'Point', coordinates: [0.25, 1.5] }
				},
				{ properties: { entity: '8', name: 'Nowhere' }, geometry: null }
			])
		).toEqual([
			{ entity: '7', name: 'Inventon Pump', dataset: 'listed-building', point: 'POINT (0.25 1.5)' }
		]);
	});
});
