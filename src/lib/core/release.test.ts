import { describe, expect, it } from 'vitest';
import type { AreaRecord } from './areas';
import {
	areaBox,
	areaSlug,
	areaWards,
	closedAreaOf,
	inArea,
	keptInArea,
	type AreaList
} from './release';

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

	describe('what an area’s fetch keeps, so no other area’s stops change', () => {
		const keep = keptInArea({
			inside: (p) => p[1] < 1,
			addresses: new Set(['12|inventa road']),
			streets: new Set(['Inventa Road'])
		});

		it('keeps a record placed inside, and drops one placed outside', () => {
			expect(keep({ id: 'a', at: [51.5, 0.5], claims: {} })).toBe(true);
			expect(keep({ id: 'b', at: [51.5, 1.5], claims: {} })).toBe(false);
		});

		it('keeps a record at an address the map has inside, whatever its case', () => {
			expect(keep({ id: 'c', address: { number: '12', street: 'INVENTA ROAD' }, claims: {} })).toBe(
				true
			);
			expect(keep({ id: 'd', address: { number: '14', street: 'Inventa Road' }, claims: {} })).toBe(
				false
			);
		});

		it('keeps a record about a street only when the street runs inside alone', () => {
			expect(keep({ id: 'e', street: 'Inventa Road', claims: {} })).toBe(true);
			expect(keep({ id: 'f', street: 'Border Road', claims: {} })).toBe(false);
		});

		it('keeps a record the map links by its tag, as the link names one thing', () => {
			expect(keep({ id: 'g', link: { key: 'ref', value: '1' }, at: [51.5, 0.5], claims: {} })).toBe(
				true
			);
		});
	});

	describe('which areas are open to walk', () => {
		const listed: AreaList = [
			{ name: 'Inventa', wards: ['Inventa North', 'Inventa South'], open: true },
			{ name: 'Elsewhere', wards: ['Elsewhere'] }
		];
		const closed = closedAreaOf(listed);

		it('leaves a stop in an open area open', () => {
			expect(closed('Inventa South')).toBeUndefined();
		});

		it('names the area a closed stop lies in, by the area people know', () => {
			expect(closed('Elsewhere')).toBe('Elsewhere');
		});

		it('names a ward no area lists by its own name, and a stop in no ward plainly', () => {
			expect(closed('Over The Border')).toBe('Over The Border');
			expect(closed(undefined)).toBe('This area');
		});

		it('opens everything while no area is marked open', () => {
			expect(
				closedAreaOf([{ name: 'Inventa', wards: ['Inventa North'] }])('Elsewhere')
			).toBeUndefined();
		});
	});
});
