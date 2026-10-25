import { describe, expect, it } from 'vitest';
import { OsmIndex, type OsmElement } from '../osm';
import { WikidataAdapter, type WikidataStore } from './wikidata';

const store: WikidataStore = {
	retrieved: '2026-10-25',
	items: {
		Q1: { label: 'The Sextant', description: 'invented public house', inception: '1868' },
		Q2: { label: 'Ada Inventa', description: 'invented engineer' },
		Q3: {
			label: 'The Old Invented Works',
			description: 'former invented factory',
			coordinates: [51.3801, -0.0701]
		},
		Q4: { label: 'Nowhere Much', description: 'invented hamlet' }
	}
};
const pub: OsmElement = {
	type: 'node',
	id: 1,
	lat: 51.38,
	lon: -0.07,
	tags: { amenity: 'pub', name: 'The Sextant', wikidata: 'Q1' }
};
const street: OsmElement = {
	type: 'way',
	id: 2,
	nodes: [3, 4],
	tags: { highway: 'residential', name: 'Long Street', 'name:etymology:wikidata': 'Q2' }
};
const ends: OsmElement[] = [
	{ type: 'node', id: 3, lat: 51.38, lon: -0.071 },
	{ type: 'node', id: 4, lat: 51.38, lon: -0.069 }
];
const osm = new OsmIndex({ elements: [pub, street, ...ends] });
const facts = () => new WikidataAdapter(osm, store).facts();

describe('WikidataAdapter', () => {
	it('describes what the map links to, under that thing, with its own source', () => {
		const about = facts().filter((f) => f.subject === 'node/1');
		expect(about.map((f) => f.claim)).toEqual([
			{ key: 'wikidata:description', value: 'invented public house' },
			{ key: 'wikidata:inception', value: '1868' }
		]);
		expect(about[0]).toMatchObject({
			source: 'wikidata',
			observed: '2026-10-25',
			geometry: [[51.38, -0.07]]
		});
	});

	it('says who a street is named for', () => {
		expect(
			facts()
				.filter((f) => f.subject === 'way/2')
				.map((f) => f.claim)
		).toEqual([
			{ key: 'etymology:label', value: 'Ada Inventa' },
			{ key: 'etymology:description', value: 'invented engineer' }
		]);
	});

	it('places what the map does not link to where Wikidata puts it', () => {
		const works = facts().filter((f) => f.subject === 'wikidata/Q3');
		expect(works.map((f) => f.claim)).toEqual([
			{ key: 'wikidata:label', value: 'The Old Invented Works' },
			{ key: 'wikidata:description', value: 'former invented factory' }
		]);
		expect(works[0].geometry).toEqual([[51.3801, -0.0701]]);
	});

	it('leaves out what is neither linked nor placed', () => {
		expect(facts().some((f) => f.subject === 'wikidata/Q4')).toBe(false);
	});

	it('does not place again what the map already links to', () => {
		const placed = { ...store.items.Q1, coordinates: [51.38, -0.07] as [number, number] };
		const twice = new WikidataAdapter(osm, { ...store, items: { ...store.items, Q1: placed } });
		expect(twice.facts().some((f) => f.subject === 'wikidata/Q1')).toBe(false);
	});

	it('reaches only as far as the thing it describes', () => {
		const street = facts().filter((f) => f.subject === 'way/2');
		const pub = facts().filter((f) => f.subject === 'node/1');
		expect(new Set(street.map((f) => f.reach))).toEqual(new Set([15]));
		expect(new Set(pub.map((f) => f.reach))).toEqual(new Set([30]));
	});

	it('keeps values exactly as found', () => {
		const odd = { ...store, items: { ...store.items, Q2: { label: 'ada inventa' } } };
		const label = new WikidataAdapter(osm, odd).facts().find((f) => f.subject === 'way/2');
		expect(label?.claim.value).toBe('ada inventa');
	});
});
