import { describe, expect, it } from 'vitest';
import { OsmIndex, type OsmRelation } from './osm';
import { SyntheticMap } from './testing/synthetic';

// An invented park drawn as a multipolygon: its outer edge in two halves, one drawn backwards,
// and a pond cut out of it. No real place.
function park() {
	const m = new SyntheticMap();
	const O = SyntheticMap.ORIGIN;
	const [a, b, c, d] = [0, 90, 180, 270].map((bearing) => m.nodeFrom(O, bearing, 100));
	const north = m.way([d, a, b], {});
	const south = m.way([d, c, b], {});
	const [p, q, r] = [0, 120, 240].map((bearing) => m.nodeFrom(O, bearing, 10));
	const pond = m.way([p, q, r, p], {});
	const id = m.relation(
		[
			{ way: north, role: 'outer' },
			{ way: south, role: 'outer' },
			{ way: pond, role: 'inner' }
		],
		{ leisure: 'park', name: 'Inventa Fields' }
	);
	const osm = new OsmIndex(m.toData());
	const relation = osm.relations.find((r) => r.id === id) as OsmRelation;
	return { m, osm, relation, ids: { a, b, c, d, north, south } };
}

describe('OsmIndex: areas drawn as multipolygons', () => {
	it('joins outer ways end to end into one closed ring, whichever way each is drawn', () => {
		const { osm, relation } = park();
		const { outer } = osm.relationRings(relation);
		expect(outer).toHaveLength(1);
		expect(outer[0]).toHaveLength(5);
		expect(outer[0][0]).toEqual(outer[0].at(-1));
	});

	it('keeps an inner ring apart, as a hole', () => {
		const { osm, relation } = park();
		const { inner } = osm.relationRings(relation);
		expect(inner).toHaveLength(1);
		expect(inner[0]).toHaveLength(4);
	});

	it('leaves out a ring that does not close, as when a member lies beyond the map', () => {
		const { m, ids } = park();
		const data = m.toData();
		const cut = {
			elements: data.elements.filter((e) => !(e.type === 'way' && e.id === ids.south))
		};
		const osm = new OsmIndex(cut);
		expect(osm.relationRings(osm.relations[0]).outer).toEqual([]);
	});
});
