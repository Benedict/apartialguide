import { describe, expect, it } from 'vitest';
import type { AreaRecord } from './areas';
import { areaBox, areaSlug, areaWards, inArea, type AreaList } from './release';

// Invented wards and areas, two squares side by side: not real boundaries.
const square = (west: number): AreaRecord['rings'] => [
	[
		[51, west],
		[51, west + 1],
		[52, west + 1],
		[52, west],
		[51, west]
	]
];
const wards: AreaRecord[] = [
	{ id: 'W1', name: 'Inventa North', kind: 'ward', rings: square(0) },
	{ id: 'W2', name: 'Inventa South', kind: 'ward', rings: square(1) },
	{ id: 'W3', name: 'Elsewhere', kind: 'ward', rings: square(2) }
];
const areas: AreaList = [
	{ name: 'Inventa', wards: ['Inventa North', 'Inventa South'] },
	{ name: 'Elsewhere', wards: ['Elsewhere'] }
];

describe('areas made of wards', () => {
	it('names the wards an area is made of, by the area’s name in any case', () => {
		expect(areaWards(areas, 'inventa')).toEqual(['Inventa North', 'Inventa South']);
	});

	it('refuses an area it does not know, rather than taking everywhere', () => {
		expect(() => areaWards(areas, 'Nowhere')).toThrow(/Nowhere/);
	});

	it('refuses an area naming a ward the boundaries do not have', () => {
		expect(() => inArea(wards, ['Inventa North', 'Inventa Middle'])).toThrow(/Inventa Middle/);
	});

	it('tells whether a place lies in any of the area’s wards', () => {
		const inside = inArea(wards, ['Inventa North', 'Inventa South']);
		expect(inside([51.5, 0.5])).toBe(true);
		expect(inside([51.5, 1.5])).toBe(true);
		expect(inside([51.5, 2.5])).toBe(false);
	});

	it('gives the box round an area’s wards, west, south, east, north, as records are fetched by', () => {
		expect(areaBox(wards, ['Inventa North', 'Inventa South'])).toBe('0,51,2,52');
	});

	it('names an area’s files by a slug of its name', () => {
		expect(areaSlug('Park Hill & Whitgift')).toBe('park-hill-whitgift');
	});
});
