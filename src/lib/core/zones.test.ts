import { describe, expect, it } from 'vitest';
import { destination, type LatLon } from './geo';
import { fixedClock } from './facts';
import { Narrator } from './narrator';
import { SyntheticMap } from './testing/synthetic';

const O = SyntheticMap.ORIGIN;
const square = (half: number): LatLon[] => {
	const [n, e, s, w] = [0, 90, 180, 270].map((b) => destination(O, b, half));
	return [
		[n[0], w[1]],
		[n[0], e[1]],
		[s[0], e[1]],
		[s[0], w[1]],
		[n[0], w[1]]
	];
};

describe('zones with holes', () => {
	it('puts a point in a hole outside the zone, as another rock lies there instead', () => {
		const map = new SyntheticMap();
		map.way([map.node(O), map.nodeFrom(O, 90, 40)]);
		const n = Narrator.fromOsm(map.toData(), {
			clock: fixedClock('2026-11-08'),
			records: [
				{
					source: 'Invented rocks',
					prefix: 'rock',
					retrieved: '2026-11-08',
					records: [],
					overlay: true,
					areas: [
						{
							id: 'r1',
							name: 'INVENTED GROUP',
							kind: 'bedrock',
							rings: [square(500)],
							holes: [square(50)]
						}
					]
				}
			]
		});
		expect(n.zonesAt(O)).toEqual([]);
		expect(n.zonesAt(destination(O, 0, 200)).map((z) => z.name)).toEqual(['INVENTED GROUP']);
	});
});
