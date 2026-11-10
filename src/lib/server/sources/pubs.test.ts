import { describe, expect, it } from 'vitest';
import { lostPubs, type PastMap } from './pubs';

// Invented pubs on an invented map: no real place.
const pub = (id: number, name: string, lat: number, lon: number) => ({
	type: 'node',
	id,
	lat,
	lon,
	tags: { amenity: 'pub', name }
});
const past = (asOf: string, elements: PastMap['elements']): PastMap => ({ asOf, elements });

describe('lostPubs', () => {
	it('keeps a named pub the past maps had and the map has no longer, with the years it was there', () => {
		const records = lostPubs(
			[
				past('2013-01-01', [
					pub(1, 'The Invented Arms', 51.38, -0.08),
					pub(2, 'The Still Here', 51.381, -0.08)
				]),
				past('2014-01-01', [
					pub(1, 'The Invented Arms', 51.38, -0.08),
					pub(2, 'The Still Here', 51.381, -0.08)
				]),
				past('2015-01-01', [pub(2, 'The Still Here', 51.381, -0.08)])
			],
			[pub(2, 'The Still Here', 51.38101, -0.08)],
			'-0.1,51.3,0,51.4'
		);
		expect(records).toEqual([
			{
				id: 'node/1',
				at: [51.38, -0.08],
				observed: '2014-01-01',
				claims: { name: 'The Invented Arms', kind: 'pub', first: '2013', last: '2014' }
			}
		]);
	});

	it('takes a pub the map now marks as closed, or one still there under another tag, as not lost', () => {
		const closed = {
			type: 'node',
			id: 9,
			lat: 51.38,
			lon: -0.08,
			tags: { 'disused:amenity': 'pub', name: 'The Invented Arms' }
		};
		const bar = {
			type: 'node',
			id: 8,
			lat: 51.3801,
			lon: -0.08,
			tags: { amenity: 'bar', name: 'the invented arms' }
		};
		const was = [past('2013-01-01', [pub(1, 'The Invented Arms', 51.38, -0.08)])];
		expect(lostPubs(was, [closed], '-0.1,51.3,0,51.4')).toEqual([]);
		expect(lostPubs(was, [bar], '-0.1,51.3,0,51.4')).toEqual([]);
	});

	it('finds a way’s place by its centre, and leaves out a pub with no name or outside the box', () => {
		const way = {
			type: 'way',
			id: 5,
			center: { lat: 51.39, lon: -0.09 },
			tags: { amenity: 'pub', name: 'The Invented Vaults' }
		};
		const records = lostPubs(
			[
				past('2016-01-01', [
					way,
					{ type: 'node', id: 6, lat: 51.38, lon: -0.08, tags: { amenity: 'pub' } },
					pub(7, 'Far Away', 52, -0.08)
				])
			],
			[],
			'-0.1,51.3,0,51.4'
		);
		expect(records.map((r) => [r.id, r.at])).toEqual([['way/5', [51.39, -0.09]]]);
	});
});
