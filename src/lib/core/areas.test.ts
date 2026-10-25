import { describe, expect, it } from 'vitest';
import { areaAt, type AreaRecord } from './areas';

const square = (lat: number, lon: number): AreaRecord['rings'][number] => [
	[lat, lon],
	[lat, lon + 1],
	[lat + 1, lon + 1],
	[lat + 1, lon],
	[lat, lon]
];
const west: AreaRecord = { id: 'w', name: 'Inventa West', kind: 'ward', rings: [square(0, 0)] };
const east: AreaRecord = {
	id: 'e',
	name: 'Inventa East',
	kind: 'ward',
	rings: [square(0, 1), square(5, 5)]
};

describe('areaAt', () => {
	it('finds the area a point lies in, in any of its parts', () => {
		expect(areaAt([0.5, 0.5], [west, east])?.name).toBe('Inventa West');
		expect(areaAt([0.5, 1.5], [west, east])?.name).toBe('Inventa East');
		expect(areaAt([5.5, 5.5], [west, east])?.name).toBe('Inventa East');
	});

	it('finds none outside them all', () => {
		expect(areaAt([3, 3], [west, east])).toBeUndefined();
	});
});
