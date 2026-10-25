import { distance, type LatLon } from '../geo';
import type { OsmElement, OsmIndex } from '../osm';
import type { StopGraph, StopId } from '../stops';
import type { Place } from './places';

/** Every street, named place and postcode in the map, each tied to the stop nearest it. */
export function buildGazetteer(osm: OsmIndex, graph: StopGraph): Place[] {
	const stops = graph.all();
	const nearest = (at: LatLon): StopId | undefined => {
		let best: { id: StopId; metres: number } | undefined;
		for (const s of stops) {
			const metres = distance(at, s.position);
			if (!best || metres < best.metres) best = { id: s.id, metres };
		}
		return best?.id;
	};

	const places = new Map<string, Place>();
	const add = (name: string, kind: Place['kind'], at: StopId | undefined) => {
		const key = `${kind}:${name}`;
		if (at && !places.has(key)) places.set(key, { name, kind, at });
	};

	for (const stop of stops) {
		for (const exit of stop.exits) if (exit.street) add(exit.street, 'street', stop.id);
	}
	for (const e of osm.data.elements) {
		const name = e.tags?.name;
		const postcode = e.tags?.['addr:postcode'];
		if ((!name || e.tags?.highway) && !postcode) continue;
		const at = centre(e, osm);
		if (!at) continue;
		const stop = nearest(at);
		if (name && !e.tags?.highway) add(name, 'place', stop);
		if (postcode) add(postcode, 'postcode', stop);
	}
	return [...places.values()];
}

function centre(e: OsmElement, osm: OsmIndex): LatLon | undefined {
	if (e.type === 'node') return [e.lat, e.lon];
	if (e.type !== 'way') return undefined;
	const points = osm.wayGeometry(e);
	if (!points.length) return undefined;
	const sum = points.reduce(([a, b], [lat, lon]) => [a + lat, b + lon], [0, 0]);
	return [sum[0] / points.length, sum[1] / points.length];
}
