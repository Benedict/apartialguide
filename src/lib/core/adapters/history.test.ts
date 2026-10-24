import { describe, expect, it } from 'vitest';
import { OsmIndex, type OsmElement } from '../osm';
import { HistoryAdapter } from './history';

const node = (id: number, tags?: Record<string, string>): OsmElement => ({
	type: 'node',
	id,
	lat: 51.38,
	lon: -0.07,
	tags
});
const map = (...elements: OsmElement[]) => new OsmIndex({ elements });

const pub = node(1, { amenity: 'pub', name: 'The Sextant' });
const bakery = node(2, { shop: 'bakery', name: 'Crumb' });
const tree = node(3, { natural: 'tree' });

describe('HistoryAdapter', () => {
	it('remembers what has gone, as it was last recorded', () => {
		const facts = new HistoryAdapter(map(pub), [
			{ asOf: '2017-01-01', osm: map(pub, bakery) }
		]).facts();
		expect(facts.map((f) => f.claim)).toEqual([
			{ key: 'was:shop', value: 'bakery' },
			{ key: 'was:name', value: 'Crumb' }
		]);
		expect(facts[0]).toMatchObject({
			subject: 'node/2',
			source: 'osm-history',
			observed: '2017-01-01'
		});
		expect(facts[0].geometry).toEqual([[51.38, -0.07]]);
	});

	it('takes the latest past map that still had it', () => {
		const facts = new HistoryAdapter(map(pub), [
			{ asOf: '2013-01-01', osm: map(bakery) },
			{ asOf: '2017-01-01', osm: map(bakery) }
		]).facts();
		expect(new Set(facts.map((f) => f.observed))).toEqual(new Set(['2017-01-01']));
	});

	it('remembers an older name of something still there', () => {
		const anchor = node(1, { amenity: 'pub', name: 'The Anchor' });
		const facts = new HistoryAdapter(map(pub), [{ asOf: '2017-01-01', osm: map(anchor) }]).facts();
		expect(facts).toEqual([
			expect.objectContaining({
				subject: 'node/1',
				claim: { key: 'was:name', value: 'The Anchor' },
				observed: '2017-01-01'
			})
		]);
	});

	it('keeps each older name once, dated by when it last held', () => {
		const anchor = node(1, { amenity: 'pub', name: 'The Anchor' });
		const facts = new HistoryAdapter(map(pub), [
			{ asOf: '2013-01-01', osm: map(anchor) },
			{ asOf: '2017-01-01', osm: map(anchor) },
			{ asOf: '2021-01-01', osm: map(pub) }
		]).facts();
		expect(facts.map((f) => [f.claim.value, f.observed])).toEqual([['The Anchor', '2017-01-01']]);
	});

	it('says nothing of what is unchanged', () => {
		expect(new HistoryAdapter(map(pub), [{ asOf: '2017-01-01', osm: map(pub) }]).facts()).toEqual(
			[]
		);
	});

	it('leaves out gone things that are neither named, used nor built', () => {
		expect(
			new HistoryAdapter(map(pub), [{ asOf: '2017-01-01', osm: map(pub, tree) }]).facts()
		).toEqual([]);
	});
});
