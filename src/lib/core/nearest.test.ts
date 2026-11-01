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

	it('finds a long named thing that passes within reach though its every point lies far beyond it', () => {
		const m = new SyntheticMap();
		const west = m.node(O);
		m.way([west, m.nodeFrom(O, 90, 120)], { highway: 'residential', name: 'Long Street' });
		m.nodeFrom(O, 180, 6, { natural: 'tree' });
		// An invented brook 300 m to the north, drawn from one point 3 km west to one 3 km east.
		const north = m.nodeFrom(O, 0, 300);
		const lat = m.toData().elements.find((e) => e.type === 'node' && e.id === north)!;
		const at = [(lat as { lat: number }).lat, O[1]] as const;
		m.way([m.nodeFrom([at[0], at[1]], 270, 3000), m.nodeFrom([at[0], at[1]], 90, 3000)], {
			waterway: 'stream',
			name: 'Inventa Brook'
		});
		const n = Narrator.fromOsm(m.toData(), { clock: fixedClock('2026-10-24') });
		const nearest = n.visit(junctionId(west))!.scene.nearest;
		expect(nearest?.tags.name).toBe('Inventa Brook');
		expect(Math.round(nearest!.metres / 10) * 10).toBe(300);
	});

	it('of two named things, gives the nearer, however many lie beyond reach', () => {
		const m = new SyntheticMap();
		const west = m.node(O);
		m.way([west, m.nodeFrom(O, 90, 120)], { highway: 'residential', name: 'Long Street' });
		m.nodeFrom(O, 180, 6, { natural: 'tree' });
		for (let i = 0; i < 40; i++)
			m.nodeFrom(O, i * 9, 1000 + i * 50, { amenity: 'cafe', name: `Far Cafe ${i}` });
		m.nodeFrom(O, 200, 350, { shop: 'bakery', name: 'Inventa Bakes' });
		m.nodeFrom(O, 20, 250, { amenity: 'cafe', name: 'Inventa Cafe' });
		const n = Narrator.fromOsm(m.toData(), { clock: fixedClock('2026-10-24') });
		expect(n.visit(junctionId(west))!.scene.nearest?.tags.name).toBe('Inventa Cafe');
	});
});
