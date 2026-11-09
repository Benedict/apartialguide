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

describe('a river’s course', () => {
	it('gives the places along a named river in the order it flows, each open or hidden', () => {
		const map = new SyntheticMap();
		// An invented street running east, and an invented brook flowing east beside it, its middle buried.
		const pts = [0, 100, 200, 300, 400].map((m) => destination(O, 90, m));
		const street = pts.map((p) => map.node(p));
		map.way(street, { highway: 'residential', name: 'Long Street' });
		const bank = pts.map((p) => map.node(destination(p, 0, 10)));
		map.way([bank[0], bank[1]], { waterway: 'stream', name: 'Inventa Brook' });
		map.way([bank[1], bank[2], bank[3]], {
			waterway: 'stream',
			name: 'Inventa Brook',
			tunnel: 'culvert'
		});
		map.way([bank[3], bank[4]], { waterway: 'stream', name: 'Inventa Brook' });
		const n = Narrator.fromOsm(map.toData(), { clock: fixedClock('2026-11-09'), spacing: 100 });
		const [course] = n.courses();
		expect(course.name).toBe('Inventa Brook');
		const along = course.points.map((p) => n.graph.get(p.stop)!.position[1]);
		expect(along).toEqual([...along].sort((a, b) => a - b));
		expect(course.points.length).toBeGreaterThanOrEqual(4);
		expect(course.points[0].hidden).toBe(false);
		expect(course.points.some((p) => p.hidden)).toBe(true);
		expect(course.points.at(-1)!.hidden).toBe(false);
	});
});

describe('a river with two arms', () => {
	it('gives each arm its own course from its source down past where they meet', () => {
		const map = new SyntheticMap();
		// Two invented arms flowing east and meeting, then on east as one: no real river.
		const meet = destination(O, 90, 300);
		const north = destination(destination(O, 0, 200), 90, 0);
		const south = destination(destination(O, 180, 200), 90, 0);
		const mouth = destination(meet, 90, 300);
		for (const from of [north, south, meet, mouth]) {
			const s = map.node(destination(from, 0, 10));
			map.way([s, map.nodeFrom(from, 90, 1)], { highway: 'residential', name: 'Short Row' });
		}
		const m = map.node(meet);
		map.way([map.node(north), m], { waterway: 'river', name: 'Inventa River' });
		map.way([map.node(south), m], { waterway: 'river', name: 'Inventa River' });
		map.way([m, map.node(mouth)], { waterway: 'river', name: 'Inventa River' });
		const n = Narrator.fromOsm(map.toData(), { clock: fixedClock('2026-11-09') });
		const arms = n.courses().filter((c) => c.name === 'Inventa River');
		expect(arms).toHaveLength(2);
		const firsts = arms.map((arm) => n.graph.get(arm.points[0].stop)!.position[0]);
		// Each arm begins at its own source, one north and one south, and both run on to the mouth.
		expect(Math.max(...firsts)).toBeGreaterThan(O[0]);
		expect(Math.min(...firsts)).toBeLessThan(O[0]);
		for (const arm of arms) {
			const last = n.graph.get(arm.points.at(-1)!.stop)!.position[1];
			expect(last).toBeGreaterThan(meet[1]);
		}
	});
});
