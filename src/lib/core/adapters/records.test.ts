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

	it('takes an address two places share for the one nearest where the record lies, and neither when it lies nowhere', () => {
		// Two invented streets of one name, some 2 km apart, each with a number 9.
		const far: OsmElement = {
			type: 'node',
			id: 3,
			lat: 51.4,
			lon: -0.07,
			tags: { shop: 'bakery', 'addr:housenumber': '9', 'addr:street': 'Long Street' }
		};
		const twice = new OsmIndex({ elements: [cafe, far, shop] });
		const found = (r: RecordStore['records'][number]) =>
			new RecordsAdapter(twice, store([r])).facts().map((f) => f.subject);
		const nine = { number: '9', street: 'Long Street' };
		expect(
			found({ id: 'a', address: nine, at: [51.39999, -0.07], claims: { price: '1' } })
		).toEqual(['node/3']);
		expect(
			found({ id: 'b', address: nine, at: [51.38011, -0.0701], claims: { price: '1' } })
		).toEqual(['node/2']);
		expect(found({ id: 'c', address: nine, claims: { price: '1' } })).toEqual([]);
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

	it('lets a record stand alone only when it has a name to be called by', () => {
		expect(
			facts(
				store([{ id: 'r7', at: [51.381, -0.071], claims: { application: 'Invented extension' } }])
			)
		).toEqual([]);
	});

	it('leaves out what it cannot place, or what the source keeps to the map', () => {
		expect(facts(store([{ id: 'r5', claims: { rating: '2' } }]))).toEqual([]);
		expect(
			facts(
				store([{ id: 'r6', at: [51.381, -0.071], claims: { rating: '2' } }], { standalone: false })
			)
		).toEqual([]);
	});

	describe('benches, by inscription', () => {
		const bench: OsmElement = {
			type: 'node',
			id: 3,
			lat: 51.381,
			lon: -0.072,
			tags: { amenity: 'bench' }
		};
		const withBench = new OsmIndex({ elements: [shop, cafe, bench] });
		const benches = (records: RecordStore['records']) =>
			new RecordsAdapter(
				withBench,
				store(records, { source: 'OpenBenches', prefix: 'bench' })
			).facts();

		it('goes with a bench the map has close by', () => {
			const found = benches([
				{
					id: '7',
					at: [51.38104, -0.07204],
					near: { key: 'amenity', value: 'bench', within: 15 },
					claims: { kind: 'bench', inscription: 'For Ada Inventa, who sat here' }
				}
			]);
			expect(found.map((f) => [f.subject, f.claim.key])).toEqual([
				['node/3', 'bench:kind'],
				['node/3', 'bench:inscription']
			]);
		});

		it('stands alone by its inscription, when the map has no bench near', () => {
			const found = benches([
				{
					id: '8',
					at: [51.39, -0.08],
					near: { key: 'amenity', value: 'bench', within: 15 },
					claims: { kind: 'bench', inscription: 'For Ada Inventa' }
				}
			]);
			expect(found.map((f) => f.subject)).toEqual(['bench/8', 'bench/8']);
		});
	});
});
