import { describe, expect, it } from 'vitest';
import { OsmAdapter } from './adapters/osm';
import { elementRef, OsmIndex } from './osm';
import type { Fact } from './facts';
import { Perception } from './perception';
import { SyntheticMap } from './testing/synthetic';
import {
	destination,
	flatProjection,
	insideRing,
	nearestOnPolyline,
	segmentsIntersect,
	type LatLon
} from './geo';

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

	it('cannot see through a building drawn as a multipolygon', () => {
		const { seen, shop } = perceive((m) => {
			const outline = m.building(destination(O, 0, 12), 8, {});
			m.relation([{ way: outline, role: 'outer' }], { building: 'yes' });
			return m.nodeFrom(O, 0, 22, { shop: 'bakery' });
		});
		expect(seen).not.toContain(shop);
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

describe('Perception, indexed', () => {
	/** The plain scan the index must agree with: every fact, every building. */
	function reference(facts: Fact[], rings: { subject: string; ring: LatLon[] }[], at: LatLon) {
		const xy = flatProjection(at);
		const blocked = (to: LatLon, subject: string) =>
			rings.some((o) => {
				if (o.subject === subject || insideRing(to, o.ring)) return false;
				for (let i = 1; i < o.ring.length; i++)
					if (segmentsIntersect(xy(at), xy(to), xy(o.ring[i - 1]), xy(o.ring[i]))) return true;
				return false;
			});
		return facts
			.filter((f) => {
				const n = nearestOnPolyline(at, f.geometry);
				return n.metres <= f.reach && !blocked(n.point, f.subject);
			})
			.map((f) => f.id)
			.sort();
	}

	it('sees exactly what a plain scan of every fact and building sees', () => {
		let seed = 7;
		const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
		const map = new SyntheticMap();
		for (let i = 0; i < 300; i++)
			map.nodeFrom(O, random() * 360, random() * 600, { shop: 'bakery', name: `Invented ${i}` });
		for (let i = 0; i < 120; i++)
			map.building(destination(O, random() * 360, random() * 600), 6 + random() * 14);
		const osm = new OsmIndex(map.toData());
		const facts = new OsmAdapter(osm).facts();
		const rings = osm.ways
			.filter((w) => w.tags?.building)
			.map((w) => ({ subject: elementRef(w), ring: osm.wayGeometry(w) }));
		const perception = Perception.fromOsm(osm, facts);
		for (let i = 0; i < 60; i++) {
			const at = destination(O, random() * 360, random() * 600);
			expect(
				perception
					.inView(at)
					.map((f) => f.id)
					.sort()
			).toEqual(reference(facts, rings, at));
		}
	});
});
