import { describe, expect, it } from 'vitest';
import { destination, distance } from './geo';
import { OsmIndex } from './osm';
import { buildStopGraph, junctionId } from './stops';
import { SyntheticMap } from './testing/synthetic';

const O = SyntheticMap.ORIGIN;

function star(bearings: number[], length = 40) {
	const map = new SyntheticMap();
	const centre = map.node(O);
	for (const b of bearings) map.way([centre, map.nodeFrom(O, b, length)]);
	return { graph: buildStopGraph(new OsmIndex(map.toData())), centre };
}

describe('buildStopGraph', () => {
	it('offers one exit per street leaving a junction', () => {
		const { graph, centre } = star([45, 180, 270]);
		const labels = graph.get(junctionId(centre))!.exits.map((e) => e.label);
		expect(labels.sort()).toEqual(['north-east', 'south', 'west']);
	});

	it('falls back to sixteen points when two exits share a label', () => {
		const { graph, centre } = star([30, 55, 200]);
		const labels = graph.get(junctionId(centre))!.exits.map((e) => e.label);
		expect(labels.sort()).toEqual(['north-east', 'north-north-east', 'south']);
	});

	it('adds the street name when sixteen points still collide', () => {
		const map = new SyntheticMap();
		const c = map.node(O);
		map.way([c, map.nodeFrom(O, 40, 40)], { highway: 'residential', name: 'A Road' });
		map.way([c, map.nodeFrom(O, 44, 40)], { highway: 'footway' });
		const labels = buildStopGraph(new OsmIndex(map.toData()))
			.get(junctionId(c))!
			.exits.map((e) => e.label);
		expect(labels.sort()).toEqual(['north-east', 'north-east (A Road)']);
	});

	it('joins parts that only pavements reach, one through another, so no street is cut off', () => {
		// Three invented streets, none meeting: the first is reached from the second only by a
		// pavement, and the third only from the second, never straight from the first.
		const map = new SyntheticMap();
		const a = [map.node(O), map.nodeFrom(O, 90, 200)];
		const b = [map.nodeFrom(O, 0, 100), map.nodeFrom(destination(O, 0, 100), 90, 60)];
		const c = [map.nodeFrom(O, 0, 400), map.nodeFrom(destination(O, 0, 400), 90, 60)];
		for (const street of [a, b, c]) map.way(street);
		map.way([a[0], b[0]], { highway: 'footway', footway: 'sidewalk' });
		map.way([b[0], c[0]], { highway: 'footway', footway: 'sidewalk' });
		const graph = buildStopGraph(new OsmIndex(map.toData()));
		const all = graph.all().map((s) => s.id);
		const seen = new Set([all[0]]);
		const queue = [all[0]];
		while (queue.length)
			for (const e of graph.get(queue.pop()!)!.exits)
				if (!seen.has(e.to)) {
					seen.add(e.to);
					queue.push(e.to);
				}
		expect([...seen].sort()).toEqual([...all].sort());
		expect(all.length).toBeGreaterThanOrEqual(6);
	});

	it('splits a long street into stops no more than the spacing apart', () => {
		const map = new SyntheticMap();
		const a = map.node(O);
		const b = map.nodeFrom(O, 90, 230);
		map.way([a, b]);
		const graph = buildStopGraph(new OsmIndex(map.toData()), { spacing: 50 });
		const path = graph.walk(junctionId(a), 'east');
		expect(path.at(-1)).toBe(junctionId(b));
		expect(path).toHaveLength(6);
		for (let i = 1; i < path.length; i++) {
			const gap = distance(graph.get(path[i - 1])!.position, graph.get(path[i])!.position);
			expect(gap).toBeCloseTo(46, 0);
		}
	});

	it('stops beside a landmark along a street, such as a plaque', () => {
		const map = new SyntheticMap();
		const a = map.node(O);
		const b = map.nodeFrom(O, 90, 200);
		map.way([a, b]);
		const plaque = destination(destination(O, 90, 80), 0, 12);
		const graph = buildStopGraph(new OsmIndex(map.toData()), { landmarks: [plaque] });
		const path = graph.walk(junctionId(a), 'east');
		expect(path).toHaveLength(3);
		expect(distance(graph.get(path[1])!.position, plaque)).toBeLessThan(15);
	});

	it('stops beside a named place drawn as a multipolygon, as beside one drawn as a way', () => {
		const map = new SyntheticMap();
		const a = map.node(O);
		const b = map.nodeFrom(O, 90, 200);
		map.way([a, b]);
		const outline = map.building(destination(destination(O, 90, 100), 0, 20), 10, {});
		map.relation([{ way: outline, role: 'outer' }], {
			amenity: 'library',
			name: 'Inventa Library'
		});
		const path = buildStopGraph(new OsmIndex(map.toData()), { spacing: 500 }).walk(
			junctionId(a),
			'east'
		);
		expect(path).toHaveLength(3);
	});

	it('ignores ways that are not walkable streets', () => {
		const map = new SyntheticMap();
		const a = map.node(O);
		map.way([a, map.nodeFrom(O, 0, 40)]);
		map.way([a, map.nodeFrom(O, 90, 40)], { highway: 'motorway' });
		map.way([a, map.nodeFrom(O, 180, 40)], { waterway: 'stream' });
		const labels = buildStopGraph(new OsmIndex(map.toData()))
			.get(junctionId(a))!
			.exits.map((e) => e.label);
		expect(labels).toEqual(['north']);
	});

	it('walks along a tram stop’s platform, as one walks from the street to the tram, but not a station’s', () => {
		// An invented tram stop: a footway from each side meets the platform, which runs between them.
		const map = new SyntheticMap();
		const south = map.node(O);
		const a = map.nodeFrom(O, 0, 30);
		const north = map.nodeFrom(map.position(a), 0, 40);
		map.way([south, map.nodeFrom(O, 90, 60)], { highway: 'residential', name: 'Invented Road' });
		map.way([south, a], { highway: 'footway' });
		const c = map.nodeFrom(map.position(a), 90, 25);
		map.way([a, c], { railway: 'platform', public_transport: 'platform', tram: 'yes' });
		map.way([c, north], { highway: 'footway' });
		const graph = buildStopGraph(new OsmIndex(map.toData()));
		const reached = new Set<string>();
		const walk = (id: string) => {
			if (reached.has(id)) return;
			reached.add(id);
			for (const e of graph.get(id)!.exits) walk(e.to);
		};
		walk(junctionId(south));
		expect(reached.has(junctionId(north))).toBe(true);
		// Where the footway meets the platform is a place to stop, as where a street changes its name.
		expect(graph.get(junctionId(a))).toBeDefined();

		const station = new SyntheticMap();
		const s = station.node(O);
		station.way([s, station.nodeFrom(O, 0, 40)]);
		station.way([s, station.nodeFrom(O, 90, 40)], { railway: 'platform', train: 'yes' });
		expect(
			buildStopGraph(new OsmIndex(station.toData()))
				.get(junctionId(s))!
				.exits.map((e) => e.label)
		).toEqual(['north']);
	});

	it('walks along a trunk road, as its pavements allow, unless the map says no one may', () => {
		const map = new SyntheticMap();
		const a = map.node(O);
		map.way([a, map.nodeFrom(O, 0, 40)]);
		map.way([a, map.nodeFrom(O, 90, 40)], { highway: 'trunk', name: 'An Invented Way' });
		map.way([a, map.nodeFrom(O, 180, 40)], { highway: 'trunk_link' });
		map.way([a, map.nodeFrom(O, 270, 40)], { highway: 'trunk', foot: 'no' });
		const labels = buildStopGraph(new OsmIndex(map.toData()))
			.get(junctionId(a))!
			.exits.map((e) => e.label);
		expect(labels.sort()).toEqual(['east', 'north', 'south']);
	});

	it('takes no way the map says no one may walk', () => {
		const map = new SyntheticMap();
		const a = map.node(O);
		map.way([a, map.nodeFrom(O, 0, 40)]);
		map.way([a, map.nodeFrom(O, 90, 40)], { highway: 'residential', foot: 'no' });
		const labels = buildStopGraph(new OsmIndex(map.toData()))
			.get(junctionId(a))!
			.exits.map((e) => e.label);
		expect(labels).toEqual(['north']);
	});

	it('names a place along a street by that street alone, so a street added elsewhere renames none', () => {
		const long = (extra: boolean) => {
			const map = new SyntheticMap();
			// An invented line far off, numbered first so it is worked through first: a stream in the
			// first map, a street in the second, so every other point and way keeps its number.
			const far = [map.nodeFrom(O, 180, 2000), map.nodeFrom(O, 180, 2400)];
			map.way(far, extra ? { highway: 'residential', name: 'Far Lane' } : { waterway: 'stream' });
			const a = map.node(O);
			map.way([a, map.nodeFrom(O, 90, 600)], { highway: 'residential', name: 'Long Lane' });
			return buildStopGraph(new OsmIndex(map.toData()))
				.all()
				.map((stop) => stop.id)
				.filter((id) => id.startsWith('w'));
		};
		const alone = long(false);
		expect(alone.length).toBeGreaterThan(1);
		for (const id of alone) expect(long(true)).toContain(id);
	});

	it('treats a node shared mid-way as a junction', () => {
		const map = new SyntheticMap();
		const w = map.node(destinationWest());
		const mid = map.node(O);
		const e = map.nodeFrom(O, 90, 30);
		map.way([w, mid, e]);
		map.way([mid, map.nodeFrom(O, 0, 30)]);
		const stop = buildStopGraph(new OsmIndex(map.toData())).get(junctionId(mid))!;
		expect(stop.exits.map((x) => x.label).sort()).toEqual(['east', 'north', 'west']);
	});
});

function destinationWest() {
	return [O[0], O[1] - 0.0004] as const;
}
