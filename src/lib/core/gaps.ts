import type { OsmIndex, Tags } from './osm';
import { isCrossable, isWalkable, type StopGraph, type StopId } from './stops';

/** The tags that say most of what a way or a point is, in the order they are looked for. */
const TELLING = [
	'highway',
	'railway',
	'public_transport',
	'man_made',
	'leisure',
	'barrier',
	'building',
	'amenity',
	'landuse',
	'natural',
	'waterway',
	'noexit'
];

const kindOf = (tags: Tags = {}) => {
	const key = TELLING.find((k) => tags[k]);
	if (!key) return undefined;
	const more = [
		tags.area === 'yes' && 'area=yes',
		tags.foot === 'no' && 'foot=no',
		tags.tram === 'yes' && 'tram=yes'
	];
	return [`${key}=${tags[key]}`, ...more.filter(Boolean)].join(' ');
};

/**
 * Every place the walk ends, sorted by what the map has where it ends: the ways it does not walk
 * that meet there ("building=yes", "highway=pedestrian area=yes"), else what the point itself is
 * ("node barrier=gate"), else nothing. A footway that ends where the map joins it to something the
 * walk does not cross shows here, as the tram platforms did, so a new kind can be looked at.
 */
export function deadEnds(osm: OsmIndex, graph: StopGraph): Map<string, StopId[]> {
	const waysAt = new Map<number, Tags[]>();
	for (const way of osm.ways)
		if (!isWalkable(way) || isCrossable(way))
			for (const id of new Set(way.nodes))
				waysAt.set(id, [...(waysAt.get(id) ?? []), way.tags ?? {}]);
	const ends = new Map<string, StopId[]>();
	for (const stop of graph.all()) {
		if (stop.kind !== 'junction' || stop.exits.length !== 1) continue;
		const node = Number(stop.id.match(/^n(-?\d+)$/)?.[1]);
		const touching = [...new Set((waysAt.get(node) ?? []).map(kindOf).filter(Boolean))].sort();
		const point = kindOf(osm.nodes.get(node)?.tags);
		const kind = touching.length ? touching.join(' + ') : point ? `node ${point}` : 'nothing';
		ends.set(kind, [...(ends.get(kind) ?? []), stop.id]);
	}
	return ends;
}
