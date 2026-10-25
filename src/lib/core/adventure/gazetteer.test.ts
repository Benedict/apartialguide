import { describe, expect, it } from 'vitest';
import { OsmIndex } from '../osm';
import { buildStopGraph, junctionId } from '../stops';
import { SyntheticMap } from '../testing/synthetic';
import { destination } from '../geo';
import { buildGazetteer } from './gazetteer';

const O = SyntheticMap.ORIGIN;

function invented() {
	const map = new SyntheticMap();
	const west = map.node(O);
	const east = map.nodeFrom(O, 90, 200);
	map.way([west, east], { highway: 'residential', name: 'Long Street' });
	map.way([east, map.nodeFrom(map.position(east), 0, 60)], {
		highway: 'residential',
		name: 'Blind Alley'
	});
	map.node(destination(O, 0, 5), { amenity: 'pub', name: 'The Sextant' });
	map.node(destination(destination(O, 90, 200), 0, 5), {
		building: 'house',
		'addr:postcode': 'ZZ1 1ZZ'
	});
	const osm = new OsmIndex(map.toData());
	return { osm, graph: buildStopGraph(osm, {}), west, east };
}

describe('buildGazetteer', () => {
	it('knows each street by name', () => {
		const { osm, graph } = invented();
		const places = buildGazetteer(osm, graph);
		const street = places.find((p) => p.name === 'Blind Alley');
		expect(street?.kind).toBe('street');
		expect(graph.get(street!.at)?.exits.some((e) => e.street === 'Blind Alley')).toBe(true);
	});

	it('ties a named place to the stop nearest it', () => {
		const { osm, graph, west } = invented();
		expect(buildGazetteer(osm, graph)).toContainEqual({
			name: 'The Sextant',
			kind: 'place',
			at: junctionId(west)
		});
	});

	it('ties a postcode to the stop nearest it, written as the map has it', () => {
		const { osm, graph, east } = invented();
		expect(buildGazetteer(osm, graph)).toContainEqual({
			name: 'ZZ1 1ZZ',
			kind: 'postcode',
			at: junctionId(east)
		});
	});

	it('lists each name once', () => {
		const { osm, graph } = invented();
		const names = buildGazetteer(osm, graph).map((p) => p.name);
		expect(names.filter((n) => n === 'Long Street')).toHaveLength(1);
	});
});
