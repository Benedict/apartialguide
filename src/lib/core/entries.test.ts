import { describe, expect, it } from 'vitest';
import { routeIndex } from './adventure/route';
import type { AdventureWorld } from './adventure/world';
import { isMineEntry } from './entries';
import { fixedClock } from './facts';
import { Narrator } from './narrator';
import { junctionId } from './stops';
import { SyntheticMap } from './testing/synthetic';

const O = SyntheticMap.ORIGIN;

/** An invented lane running east, and an invented shaft off it to the north. */
function lane(shaftAt: number, tags: Record<string, string>) {
	const m = new SyntheticMap();
	const west = m.node(O);
	m.way([west, m.nodeFrom(O, 90, 120)], { highway: 'track', name: 'Inventa Lane' });
	m.nodeFrom(O, 180, 6, { natural: 'tree' });
	m.nodeFrom(O, 0, shaftAt, tags);
	return {
		n: Narrator.fromOsm(m.toData(), { clock: fixedClock('2026-11-07') }),
		west: junctionId(west)
	};
}

describe('ways into a mine', () => {
	it('knows a shaft, an adit or a mine, as marked, disused or abandoned', () => {
		for (const tags of <Record<string, string>[]>[
			{ man_made: 'mineshaft' },
			{ man_made: 'adit' },
			{ historic: 'mine_shaft' },
			{ historic: 'mine_adit' },
			{ historic: 'mine' },
			{ 'disused:man_made': 'mineshaft' },
			{ 'abandoned:man_made': 'adit' },
			{ landuse: 'quarry', 'disused:man_made': 'mineshaft' }
		])
			expect(isMineEntry(tags)).toBe(true);
		for (const tags of <Record<string, string>[]>[
			{ man_made: 'tower' },
			{ landuse: 'quarry' },
			{ historic: 'monument' }
		])
			expect(isMineEntry(tags)).toBe(false);
	});

	it('tells a shaft in view by kind and name alone, never which way or how far', () => {
		const { n, west } = lane(30, { man_made: 'mineshaft', name: 'Inventa Shaft' });
		const told = n.visit(west)!;
		const line = told.text.split('\n').find((l) => l.includes('Inventa Shaft'))!;
		expect(line).toBeDefined();
		expect(line).not.toMatch(/north|metres|steps|beside you|right here/i);
		expect(line).toMatch(/^Near here/);
	});

	it('never gives a shaft as the nearest name, which would say which way it lies', () => {
		const { n, west } = lane(200, { historic: 'mine_shaft', name: 'Inventa Shaft' });
		expect(n.visit(west)!.scene.nearest).toBeUndefined();
	});

	it('plans no way to a shaft, nor starts a walk at one', () => {
		const world = {
			stops: {
				a: {
					title: 'A',
					paragraphs: [],
					exits: [],
					things: [
						{ id: 'node/1', name: 'Inventa Shaft', aliases: [], description: '', entry: true },
						{ id: 'node/2', name: 'Inventa Chapel', aliases: [], description: '' }
					]
				}
			}
		} as unknown as Pick<AdventureWorld, 'stops'>;
		const index = routeIndex(world);
		expect(index.names['inventa chapel']).toEqual(['a']);
		expect(index.names['inventa shaft']).toBeUndefined();
	});

	it('marks a shaft among the things of a place as a way into a mine', () => {
		const { n, west } = lane(30, { man_made: 'mineshaft', name: 'Inventa Shaft' });
		const thing = n.visit(west)!.room.things.find((t) => t.name.includes('Inventa Shaft'));
		expect(thing?.entry).toBe(true);
	});
});
