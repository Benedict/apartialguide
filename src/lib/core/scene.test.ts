import { describe, expect, it } from 'vitest';
import { OsmIndex } from './osm';
import { buildScene } from './scene';
import { buildStopGraph, junctionId } from './stops';
import { SyntheticMap } from './testing/synthetic';

const O = SyntheticMap.ORIGIN;

/** An invented crossroads: Long Street runs east, Short Row north from its west end, Blind Alley a dead end east. */
function town() {
	const m = new SyntheticMap();
	const west = m.node(O);
	const east = m.nodeFrom(O, 90, 200);
	m.way([west, east], { highway: 'residential', name: 'Long Street' });
	m.way([west, m.nodeFrom(O, 0, 40)], { highway: 'residential', name: 'Short Row' });
	m.way([east, m.nodeFrom(m.position(east), 90, 40)], {
		highway: 'residential',
		name: 'Blind Alley'
	});
	return { graph: buildStopGraph(new OsmIndex(m.toData())), west, east };
}

const plan = (stopId: string) => ({
	stopId,
	street: [],
	beats: [],
	hidden: [],
	mood: 'plain' as const
});

describe('buildScene', () => {
	it('names the streets that meet at a junction', () => {
		const { graph, west } = town();
		const stop = graph.get(junctionId(west))!;
		expect(buildScene(graph, stop, plan(stop.id)).here).toEqual(['Long Street', 'Short Row']);
	});

	it('says which streets a corridor stop lies between', () => {
		const { graph, west } = town();
		const mid = graph.walk(junctionId(west), 'east')[1];
		expect(buildScene(graph, graph.get(mid)!, plan(mid)).between).toEqual([
			'Short Row',
			'Blind Alley'
		]);
	});

	it('says where each exit leads', () => {
		const { graph, west } = town();
		const stop = graph.get(junctionId(west))!;
		const exits = buildScene(graph, stop, plan(stop.id)).exits;
		expect(exits).toContainEqual(
			expect.objectContaining({
				label: 'east',
				street: 'Long Street',
				towards: 'Blind Alley',
				metres: expect.closeTo(200, -1)
			})
		);
		expect(exits).toContainEqual(
			expect.objectContaining({
				label: 'north',
				street: 'Short Row',
				towards: 'a dead end',
				metres: expect.closeTo(40, -1)
			})
		);
	});
});
