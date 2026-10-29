import { describe, expect, it } from 'vitest';
import { fixedClock } from './facts';
import { Narrator } from './narrator';
import { junctionId } from './stops';
import { SyntheticMap } from './testing/synthetic';

const O = SyntheticMap.ORIGIN;

/** An invented street running east, with an invented cafe well off it to the north. */
function narrator(cafeAt = 200, nearShop = false, quiet = true) {
	const m = new SyntheticMap();
	const west = m.node(O);
	m.way([west, m.nodeFrom(O, 90, 120)], { highway: 'residential', name: 'Long Street' });
	// A quiet stop: something in view, nothing named.
	if (quiet) m.nodeFrom(O, 180, 6, { natural: 'tree' });
	m.nodeFrom(O, 0, cafeAt, { amenity: 'cafe', name: 'Inventa Cafe' });
	if (nearShop) m.nodeFrom(O, 0, 8, { shop: 'bakery', name: 'Inventa Bakes' });
	return {
		n: Narrator.fromOsm(m.toData(), { clock: fixedClock('2026-10-24') }),
		west: junctionId(west)
	};
}

describe('the nearest name, at a stop where nothing named is in view', () => {
	it('points to the nearest named thing out of view, by name and kind, how far and which way', () => {
		const { n, west } = narrator();
		const nearest = n.visit(west)!.scene.nearest;
		expect(nearest?.tags.name).toBe('Inventa Cafe');
		expect(Math.round(nearest!.metres / 10) * 10).toBe(200);
		expect(Math.round(nearest!.bearing) % 360).toBe(0);
		expect(n.visit(west)!.text).toContain(
			'The nearest name is “Inventa Cafe”, a cafe, 200 metres to the north.'
		);
	});

	it('leaves an empty stop empty', () => {
		const empty = narrator(200, false, false);
		expect(empty.n.visit(empty.west)!.scene.nearest).toBeUndefined();
	});

	it('points nowhere when something named is in view, or when no name lies near enough', () => {
		expect(narrator(200, true).n.visit(narrator(200, true).west)!.scene.nearest).toBeUndefined();
		const far = narrator(900);
		expect(far.n.visit(far.west)!.scene.nearest).toBeUndefined();
	});
});
