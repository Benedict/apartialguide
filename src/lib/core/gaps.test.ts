import { describe, expect, it } from 'vitest';
import { OsmIndex } from './osm';
import { deadEnds } from './gaps';
import { buildStopGraph } from './stops';
import { SyntheticMap } from './testing/synthetic';

const O = SyntheticMap.ORIGIN;

describe('deadEnds', () => {
	it('sorts the ends of ways by what the map has where each ends, so a kind not walked can be seen', () => {
		// Invented: a street with three ways off it, ending at nothing, at a building and at a gate.
		const map = new SyntheticMap();
		const a = map.node(O);
		const b = map.nodeFrom(O, 90, 300);
		map.way([a, b], { highway: 'residential', name: 'Inventa Road' });
		const plain = map.nodeFrom(O, 0, 60);
		map.way([a, plain]);
		const door = map.nodeFrom(O, 180, 60);
		map.way([a, door], { highway: 'footway' });
		// The footway ends at a corner of a building's outline, as at its door.
		const corner = (bearing: number) => map.nodeFrom(map.position(door), bearing, 8);
		map.way([door, corner(160), corner(200), door], { building: 'yes' });
		const gate = map.nodeFrom(map.position(b), 0, 60, { barrier: 'gate' });
		map.way([b, gate]);
		const osm = new OsmIndex(map.toData());
		const ends = deadEnds(osm, buildStopGraph(osm));
		expect(ends.get('nothing')).toHaveLength(1);
		expect(ends.get('building=yes')).toHaveLength(1);
		expect(ends.get('node barrier=gate')).toHaveLength(1);
	});
});
