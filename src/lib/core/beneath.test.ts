import { describe, expect, it } from 'vitest';
import { destination } from './geo';
import { fixedClock } from './facts';
import { Narrator } from './narrator';
import { SyntheticMap } from './testing/synthetic';

// An invented brook, partly in a culvert under an invented street: no real river.
const O = SyntheticMap.ORIGIN;

function brookUnderStreet() {
	const map = new SyntheticMap();
	map.way([map.node(O), map.nodeFrom(O, 90, 300)], { highway: 'residential', name: 'Long Street' });
	const west = destination(O, 270, 200);
	const a = map.node(west);
	const b = map.node(destination(O, 0, 5));
	const c = map.nodeFrom(O, 90, 150);
	map.way([a, b], { waterway: 'stream', name: 'Inventa Brook' });
	map.way([b, c], { waterway: 'stream', name: 'Inventa Brook', tunnel: 'culvert' });
	map.way([map.nodeFrom(O, 180, 5), map.nodeFrom(O, 90, 100)], {
		waterway: 'drain',
		tunnel: 'culvert'
	});
	return Narrator.fromOsm(map.toData(), { clock: fixedClock('2026-11-09') });
}

describe('what runs beneath a place', () => {
	it('finds a named river in a culvert under where you stand, and how it runs', () => {
		const n = brookUnderStreet();
		expect(n.beneathAt(destination(O, 90, 50))).toEqual([
			{ name: 'Inventa Brook', how: 'in a culvert' }
		]);
	});

	it('leaves out an open stretch, a buried one far off, and one without a name', () => {
		const n = brookUnderStreet();
		expect(n.beneathAt(destination(O, 270, 100))).toEqual([]);
		expect(n.beneathAt(destination(O, 90, 280))).toEqual([]);
		expect(n.beneathAt(destination(O, 90, 50)).map((b) => b.name)).not.toContain(undefined);
	});
});
