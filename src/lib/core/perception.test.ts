import { describe, expect, it } from 'vitest';
import { OsmAdapter } from './adapters/osm';
import { OsmIndex } from './osm';
import { Perception } from './perception';
import { SyntheticMap } from './testing/synthetic';
import { destination } from './geo';

const O = SyntheticMap.ORIGIN;

/** Builds a map and returns the subjects seen from the origin, plus the id `build` returns. */
function perceive(build: (m: SyntheticMap) => number) {
	const map = new SyntheticMap();
	const id = build(map);
	const osm = new OsmIndex(map.toData());
	const seen = Perception.fromOsm(osm, new OsmAdapter(osm).facts()).inView(O);
	return { seen: [...new Set(seen.map((f) => f.subject))], shop: `node/${id}` };
}

describe('Perception', () => {
	it('sees features within their reach', () => {
		const { seen, shop } = perceive((m) => m.nodeFrom(O, 0, 20, { shop: 'bakery' }));
		expect(seen).toEqual([shop]);
	});

	it('does not see features beyond their reach', () => {
		const { seen } = perceive((m) => m.nodeFrom(O, 0, 45, { shop: 'bakery' }));
		expect(seen).toEqual([]);
	});

	it('cannot see through a mapped building', () => {
		const { seen, shop } = perceive((m) => {
			m.building(destination(O, 0, 12), 8);
			return m.nodeFrom(O, 0, 25, { shop: 'bakery' });
		});
		expect(seen).not.toContain(shop);
		expect(seen).toHaveLength(1);
	});

	it('sees a shop inside the building that holds it', () => {
		const { seen, shop } = perceive((m) => {
			m.building(destination(O, 0, 20), 16);
			return m.nodeFrom(O, 0, 20, { shop: 'bakery' });
		});
		expect(seen).toContain(shop);
	});

	it('sees through where nothing is mapped', () => {
		const { seen, shop: bench } = perceive((m) => m.nodeFrom(O, 0, 25, { amenity: 'bench' }));
		expect(seen).toEqual([bench]);
	});
});
