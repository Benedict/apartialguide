import { describe, expect, it } from 'vitest';
import type { RecordStore } from './adapters/records';
import type { OsmData } from './osm';
import { suppressElements, suppressRecords, type Suppression } from './suppression';

// Invented records and map: no real place.
const store = (prefix: string, records: RecordStore['records']): RecordStore => ({
	source: `Invented ${prefix}`,
	prefix,
	retrieved: '2026-10-25',
	records
});
const asked = '2026-11-06';

describe('suppressRecords', () => {
	const planning = store('planning', [
		{ id: '24/9', address: { number: '12', street: 'Example Road' }, claims: { application: 'A' } },
		{ id: '24/10', address: { number: '14', street: 'Example Road' }, claims: { application: 'B' } }
	]);
	const hygiene = store('hygiene', [
		{ id: '501', address: { number: '12', street: 'Example Road' }, claims: { rating: '5' } },
		{ id: '502', claims: { rating: '4' } }
	]);
	const ids = (stores: RecordStore[]) => stores.flatMap((s) => s.records.map((r) => r.id));

	it('takes out a planning record by its reference, and an establishment by its id', () => {
		const list: Suppression[] = [
			{ source: 'planning', id: '24/9', asked },
			{ source: 'hygiene', id: '502', asked }
		];
		expect(ids(suppressRecords([planning, hygiene], list))).toEqual(['24/10', '501']);
	});

	it('takes out every record at an address, of one source or of all', () => {
		const address = { number: '12', street: 'example road' };
		expect(ids(suppressRecords([planning, hygiene], [{ address, asked }]))).toEqual([
			'24/10',
			'502'
		]);
		expect(
			ids(suppressRecords([planning, hygiene], [{ source: 'hygiene', address, asked }]))
		).toEqual(['24/9', '24/10', '502']);
	});
});

describe('suppressElements', () => {
	const data: OsmData = {
		elements: [
			{ type: 'node', id: 1, lat: 51.38, lon: -0.07, tags: { name: 'Invented House' } },
			{ type: 'node', id: 2, lat: 51.38, lon: -0.071 },
			{ type: 'way', id: 3, nodes: [1, 2], tags: { highway: 'residential', name: 'Example Road' } }
		]
	};

	it('keeps an element the map draws a street through, but with nothing to tell of it', () => {
		const out = suppressElements(data, [{ osm: 'node/1', asked }]);
		expect(out.elements.find((e) => e.id === 1)).toEqual({
			type: 'node',
			id: 1,
			lat: 51.38,
			lon: -0.07
		});
		expect(out.elements.find((e) => e.id === 3)?.tags?.name).toBe('Example Road');
	});

	it('leaves the map as it was with nothing on the list', () => {
		expect(suppressElements(data, [])).toBe(data);
	});
});
