import { describe, expect, it } from 'vitest';
import { OsmIndex, type OsmElement } from '../osm';
import { RecordsAdapter, type RecordStore } from './records';

const shop: OsmElement = {
	type: 'node',
	id: 1,
	lat: 51.38,
	lon: -0.07,
	tags: { amenity: 'fast_food', name: 'Invented Kebab', 'fhrs:id': '111' }
};
const cafe: OsmElement = {
	type: 'node',
	id: 2,
	lat: 51.3801,
	lon: -0.0701,
	tags: {
		amenity: 'cafe',
		name: 'Invented Cafe',
		'addr:housenumber': '9',
		'addr:street': 'Long Street'
	}
};
const osm = new OsmIndex({ elements: [shop, cafe] });

const store = (records: RecordStore['records'], more: Partial<RecordStore> = {}): RecordStore => ({
	source: 'FSA',
	prefix: 'hygiene',
	retrieved: '2026-10-25',
	records,
	...more
});
const facts = (s: RecordStore) => new RecordsAdapter(osm, s).facts();

describe('RecordsAdapter', () => {
	it('attaches a record to the thing the map links it to, under that thing, with its own source', () => {
		const found = facts(
			store([
				{
					id: 'r1',
					link: { key: 'fhrs:id', value: '111' },
					observed: '2024-03-01',
					claims: { rating: '5' }
				}
			])
		);
		expect(found).toEqual([
			expect.objectContaining({
				subject: 'node/1',
				claim: { key: 'hygiene:rating', value: '5' },
				source: 'FSA',
				observed: '2024-03-01',
				elsewhere: true,
				geometry: [[51.38, -0.07]]
			})
		]);
	});

	it('attaches a record by address, whatever the case', () => {
		const found = facts(
			store([{ id: 'r2', address: { number: '9', street: 'long street' }, claims: { price: '1' } }])
		);
		expect(found.map((f) => f.subject)).toEqual(['node/2']);
		expect(found[0].observed).toBe('2026-10-25');
	});

	it('attaches a record by name to a thing of that name close by', () => {
		const found = facts(
			store([
				{ id: 'r3', at: [51.38002, -0.07001], claims: { name: 'INVENTED CAFE', rating: '4' } }
			])
		);
		expect(new Set(found.map((f) => f.subject))).toEqual(new Set(['node/2']));
	});

	it('places a record the map does not have where the source puts it, as a thing of its own', () => {
		const found = facts(
			store([
				{ id: 'r4', at: [51.381, -0.071], claims: { name: 'The Old Invented Mill', rating: '3' } }
			])
		);
		expect(found[0]).toMatchObject({ subject: 'hygiene/r4', geometry: [[51.381, -0.071]] });
	});

	it('attaches a record about a street to every stretch of that street', () => {
		const stretches: OsmElement[] = [
			{ type: 'node', id: 10, lat: 51.38, lon: -0.072 },
			{ type: 'node', id: 11, lat: 51.38, lon: -0.071 },
			{ type: 'node', id: 12, lat: 51.38, lon: -0.07 },
			{
				type: 'way',
				id: 20,
				nodes: [10, 11],
				tags: { highway: 'residential', name: 'Long Street' }
			},
			{
				type: 'way',
				id: 21,
				nodes: [11, 12],
				tags: { highway: 'residential', name: 'Long Street' }
			}
		];
		const found = new RecordsAdapter(new OsmIndex({ elements: stretches }), {
			...store([{ id: 'c1', street: 'Long Street', claims: { reports: '3' } }]),
			prefix: 'crime'
		}).facts();
		expect(found.map((f) => [f.subject, f.reach])).toEqual([
			['way/20', 15],
			['way/21', 15]
		]);
	});

	it('leaves out what it cannot place, or what the source keeps to the map', () => {
		expect(facts(store([{ id: 'r5', claims: { rating: '2' } }]))).toEqual([]);
		expect(
			facts(
				store([{ id: 'r6', at: [51.381, -0.071], claims: { rating: '2' } }], { standalone: false })
			)
		).toEqual([]);
	});
});
